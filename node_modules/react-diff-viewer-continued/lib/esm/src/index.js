import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import cn from "classnames";
import * as React from "react";
import memoize from "memoize-one";
import { computeHiddenBlocks } from "./compute-hidden-blocks.js";
import { DiffMethod, DiffType, computeLineInformation, } from "./compute-lines.js";
import { Expand } from "./expand.js";
import computeStyles from "./styles.js";
import { Fold } from "./fold.js";
export var LineNumberPrefix;
(function (LineNumberPrefix) {
    LineNumberPrefix["LEFT"] = "L";
    LineNumberPrefix["RIGHT"] = "R";
})(LineNumberPrefix || (LineNumberPrefix = {}));
class DiffViewer extends React.Component {
    styles;
    static defaultProps = {
        oldValue: "",
        newValue: "",
        splitView: true,
        highlightLines: [],
        disableWordDiff: false,
        compareMethod: DiffMethod.CHARS,
        styles: {},
        hideLineNumbers: false,
        extraLinesSurroundingDiff: 3,
        showDiffOnly: true,
        useDarkTheme: false,
        linesOffset: 0,
        nonce: "",
    };
    constructor(props) {
        super(props);
        this.state = {
            expandedBlocks: [],
            noSelect: undefined,
        };
    }
    /**
     * Resets code block expand to the initial stage. Will be exposed to the parent component via
     * refs.
     */
    resetCodeBlocks = () => {
        if (this.state.expandedBlocks.length > 0) {
            this.setState({
                expandedBlocks: [],
            });
            return true;
        }
        return false;
    };
    /**
     * Pushes the target expanded code block to the state. During the re-render,
     * this value is used to expand/fold unmodified code.
     */
    onBlockExpand = (id) => {
        const prevState = this.state.expandedBlocks.slice();
        prevState.push(id);
        this.setState({
            expandedBlocks: prevState,
        });
    };
    /**
     * Computes final styles for the diff viewer. It combines the default styles with the user
     * supplied overrides. The computed styles are cached with performance in mind.
     *
     * @param styles User supplied style overrides.
     */
    computeStyles = memoize(computeStyles);
    /**
     * Returns a function with clicked line number in the closure. Returns an no-op function when no
     * onLineNumberClick handler is supplied.
     *
     * @param id Line id of a line.
     */
    onLineNumberClickProxy = (id) => {
        if (this.props.onLineNumberClick) {
            return (e) => this.props.onLineNumberClick(id, e);
        }
        return () => { };
    };
    /**
     * Maps over the word diff and constructs the required React elements to show word diff.
     *
     * @param diffArray Word diff information derived from line information.
     * @param renderer Optional renderer to format diff words. Useful for syntax highlighting.
     */
    renderWordDiff = (diffArray, renderer) => {
        return diffArray.map((wordDiff, i) => {
            const content = renderer
                ? renderer(wordDiff.value)
                : (typeof wordDiff.value === 'string'
                    ? wordDiff.value
                    // If wordDiff.value is DiffInformation, we don't handle it, unclear why. See c0c99f5712.
                    : undefined);
            return wordDiff.type === DiffType.ADDED ? (_jsx("ins", { className: cn(this.styles.wordDiff, {
                    [this.styles.wordAdded]: wordDiff.type === DiffType.ADDED,
                }), children: content }, i)) : wordDiff.type === DiffType.REMOVED ? (_jsx("del", { className: cn(this.styles.wordDiff, {
                    [this.styles.wordRemoved]: wordDiff.type === DiffType.REMOVED,
                }), children: content }, i)) : (_jsx("span", { className: cn(this.styles.wordDiff), children: content }, i));
        });
    };
    /**
     * Maps over the line diff and constructs the required react elements to show line diff. It calls
     * renderWordDiff when encountering word diff. This takes care of both inline and split view line
     * renders.
     *
     * @param lineNumber Line number of the current line.
     * @param type Type of diff of the current line.
     * @param prefix Unique id to prefix with the line numbers.
     * @param value Content of the line. It can be a string or a word diff array.
     * @param additionalLineNumber Additional line number to be shown. Useful for rendering inline
     *  diff view. Right line number will be passed as additionalLineNumber.
     * @param additionalPrefix Similar to prefix but for additional line number.
     */
    renderLine = (lineNumber, type, prefix, value, additionalLineNumber, additionalPrefix) => {
        const lineNumberTemplate = `${prefix}-${lineNumber}`;
        const additionalLineNumberTemplate = `${additionalPrefix}-${additionalLineNumber}`;
        const highlightLine = this.props.highlightLines.includes(lineNumberTemplate) ||
            this.props.highlightLines.includes(additionalLineNumberTemplate);
        const added = type === DiffType.ADDED;
        const removed = type === DiffType.REMOVED;
        const changed = type === DiffType.CHANGED;
        let content;
        const hasWordDiff = Array.isArray(value);
        if (hasWordDiff) {
            content = this.renderWordDiff(value, this.props.renderContent);
        }
        else if (this.props.renderContent) {
            content = this.props.renderContent(value);
        }
        else {
            content = value;
        }
        let ElementType = "div";
        if (added && !hasWordDiff) {
            ElementType = "ins";
        }
        else if (removed && !hasWordDiff) {
            ElementType = "del";
        }
        return (_jsxs(_Fragment, { children: [!this.props.hideLineNumbers && (_jsx("td", { onClick: lineNumber && this.onLineNumberClickProxy(lineNumberTemplate), className: cn(this.styles.gutter, {
                        [this.styles.emptyGutter]: !lineNumber,
                        [this.styles.diffAdded]: added,
                        [this.styles.diffRemoved]: removed,
                        [this.styles.diffChanged]: changed,
                        [this.styles.highlightedGutter]: highlightLine,
                    }), children: _jsx("pre", { className: this.styles.lineNumber, children: lineNumber }) })), !this.props.splitView && !this.props.hideLineNumbers && (_jsx("td", { onClick: additionalLineNumber &&
                        this.onLineNumberClickProxy(additionalLineNumberTemplate), className: cn(this.styles.gutter, {
                        [this.styles.emptyGutter]: !additionalLineNumber,
                        [this.styles.diffAdded]: added,
                        [this.styles.diffRemoved]: removed,
                        [this.styles.diffChanged]: changed,
                        [this.styles.highlightedGutter]: highlightLine,
                    }), children: _jsx("pre", { className: this.styles.lineNumber, children: additionalLineNumber }) })), this.props.renderGutter
                    ? this.props.renderGutter({
                        lineNumber,
                        type,
                        prefix,
                        value,
                        additionalLineNumber,
                        additionalPrefix,
                        styles: this.styles,
                    })
                    : null, _jsx("td", { className: cn(this.styles.marker, {
                        [this.styles.emptyLine]: !content,
                        [this.styles.diffAdded]: added,
                        [this.styles.diffRemoved]: removed,
                        [this.styles.diffChanged]: changed,
                        [this.styles.highlightedLine]: highlightLine,
                    }), children: _jsxs("pre", { children: [added && "+", removed && "-"] }) }), _jsx("td", { className: cn(this.styles.content, {
                        [this.styles.emptyLine]: !content,
                        [this.styles.diffAdded]: added,
                        [this.styles.diffRemoved]: removed,
                        [this.styles.diffChanged]: changed,
                        [this.styles.highlightedLine]: highlightLine,
                        left: prefix === LineNumberPrefix.LEFT,
                        right: prefix === LineNumberPrefix.RIGHT,
                    }), onMouseDown: () => {
                        const elements = document.getElementsByClassName(prefix === LineNumberPrefix.LEFT ? "right" : "left");
                        for (let i = 0; i < elements.length; i++) {
                            const element = elements.item(i);
                            element.classList.add(this.styles.noSelect);
                        }
                    }, title: added && !hasWordDiff
                        ? "Added line"
                        : removed && !hasWordDiff
                            ? "Removed line"
                            : undefined, children: _jsx(ElementType, { className: this.styles.contentText, children: content }) })] }));
    };
    /**
     * Generates lines for split view.
     *
     * @param obj Line diff information.
     * @param obj.left Life diff information for the left pane of the split view.
     * @param obj.right Life diff information for the right pane of the split view.
     * @param index React key for the lines.
     */
    renderSplitView = ({ left, right }, index) => {
        return (_jsxs("tr", { className: this.styles.line, children: [this.renderLine(left.lineNumber, left.type, LineNumberPrefix.LEFT, left.value), this.renderLine(right.lineNumber, right.type, LineNumberPrefix.RIGHT, right.value)] }, index));
    };
    /**
     * Generates lines for inline view.
     *
     * @param obj Line diff information.
     * @param obj.left Life diff information for the added section of the inline view.
     * @param obj.right Life diff information for the removed section of the inline view.
     * @param index React key for the lines.
     */
    renderInlineView = ({ left, right }, index) => {
        let content;
        if (left.type === DiffType.REMOVED && right.type === DiffType.ADDED) {
            return (_jsxs(React.Fragment, { children: [_jsx("tr", { className: this.styles.line, children: this.renderLine(left.lineNumber, left.type, LineNumberPrefix.LEFT, left.value, null) }), _jsx("tr", { className: this.styles.line, children: this.renderLine(null, right.type, LineNumberPrefix.RIGHT, right.value, right.lineNumber, LineNumberPrefix.RIGHT) })] }, index));
        }
        if (left.type === DiffType.REMOVED) {
            content = this.renderLine(left.lineNumber, left.type, LineNumberPrefix.LEFT, left.value, null);
        }
        if (left.type === DiffType.DEFAULT) {
            content = this.renderLine(left.lineNumber, left.type, LineNumberPrefix.LEFT, left.value, right.lineNumber, LineNumberPrefix.RIGHT);
        }
        if (right.type === DiffType.ADDED) {
            content = this.renderLine(null, right.type, LineNumberPrefix.RIGHT, right.value, right.lineNumber);
        }
        return (_jsx("tr", { className: this.styles.line, children: content }, index));
    };
    /**
     * Returns a function with clicked block number in the closure.
     *
     * @param id Cold fold block id.
     */
    onBlockClickProxy = (id) => () => this.onBlockExpand(id);
    /**
     * Generates cold fold block. It also uses the custom message renderer when available to show
     * cold fold messages.
     *
     * @param num Number of skipped lines between two blocks.
     * @param blockNumber Code fold block id.
     * @param leftBlockLineNumber First left line number after the current code fold block.
     * @param rightBlockLineNumber First right line number after the current code fold block.
     */
    renderSkippedLineIndicator = (num, blockNumber, leftBlockLineNumber, rightBlockLineNumber) => {
        const { hideLineNumbers, splitView } = this.props;
        const message = this.props.codeFoldMessageRenderer ? (this.props.codeFoldMessageRenderer(num, leftBlockLineNumber, rightBlockLineNumber)) : (_jsxs("span", { className: this.styles.codeFoldContent, children: ["Expand ", num, " lines ..."] }));
        const content = (_jsx("td", { className: this.styles.codeFoldContentContainer, children: _jsx("button", { type: "button", className: this.styles.codeFoldExpandButton, onClick: this.onBlockClickProxy(blockNumber), tabIndex: 0, children: message }) }));
        const isUnifiedViewWithoutLineNumbers = !splitView && !hideLineNumbers;
        return (_jsxs("tr", { className: this.styles.codeFold, children: [!hideLineNumbers && _jsx("td", { className: this.styles.codeFoldGutter }), this.props.renderGutter ? (_jsx("td", { className: this.styles.codeFoldGutter })) : null, _jsx("td", { className: cn({
                        [this.styles.codeFoldGutter]: isUnifiedViewWithoutLineNumbers,
                    }) }), isUnifiedViewWithoutLineNumbers ? (_jsxs(React.Fragment, { children: [_jsx("td", {}), content] })) : (_jsxs(React.Fragment, { children: [content, this.props.renderGutter ? _jsx("td", {}) : null, _jsx("td", {}), _jsx("td", {}), !hideLineNumbers ? _jsx("td", {}) : null] }))] }, `${leftBlockLineNumber}-${rightBlockLineNumber}`));
    };
    /**
     * Generates the entire diff view.
     */
    renderDiff = () => {
        const { oldValue, newValue, splitView, disableWordDiff, compareMethod, linesOffset, } = this.props;
        const { lineInformation, diffLines } = computeLineInformation(oldValue, newValue, disableWordDiff, compareMethod, linesOffset, this.props.alwaysShowLines);
        const extraLines = this.props.extraLinesSurroundingDiff < 0
            ? 0
            : Math.round(this.props.extraLinesSurroundingDiff);
        const { lineBlocks, blocks } = computeHiddenBlocks(lineInformation, diffLines, extraLines);
        const diffNodes = lineInformation.map((line, lineIndex) => {
            if (this.props.showDiffOnly) {
                const blockIndex = lineBlocks[lineIndex];
                if (blockIndex !== undefined) {
                    const lastLineOfBlock = blocks[blockIndex].endLine === lineIndex;
                    if (!this.state.expandedBlocks.includes(blockIndex) &&
                        lastLineOfBlock) {
                        return (_jsx(React.Fragment, { children: this.renderSkippedLineIndicator(blocks[blockIndex].lines, blockIndex, line.left.lineNumber, line.right.lineNumber) }, lineIndex));
                    }
                    if (!this.state.expandedBlocks.includes(blockIndex)) {
                        return null;
                    }
                }
            }
            return splitView
                ? this.renderSplitView(line, lineIndex)
                : this.renderInlineView(line, lineIndex);
        });
        return {
            diffNodes,
            blocks,
            lineInformation,
        };
    };
    render = () => {
        const { oldValue, newValue, useDarkTheme, leftTitle, rightTitle, splitView, compareMethod, hideLineNumbers, nonce, } = this.props;
        if (typeof compareMethod === "string" &&
            compareMethod !== DiffMethod.JSON) {
            if (typeof oldValue !== "string" || typeof newValue !== "string") {
                throw Error('"oldValue" and "newValue" should be strings');
            }
        }
        this.styles = this.computeStyles(this.props.styles, useDarkTheme, nonce);
        const nodes = this.renderDiff();
        let colSpanOnSplitView = 3;
        let colSpanOnInlineView = 4;
        if (hideLineNumbers) {
            colSpanOnSplitView -= 1;
            colSpanOnInlineView -= 1;
        }
        if (this.props.renderGutter) {
            colSpanOnSplitView += 1;
            colSpanOnInlineView += 1;
        }
        let deletions = 0;
        let additions = 0;
        for (const l of nodes.lineInformation) {
            if (l.left.type === DiffType.ADDED) {
                additions++;
            }
            if (l.right.type === DiffType.ADDED) {
                additions++;
            }
            if (l.left.type === DiffType.REMOVED) {
                deletions++;
            }
            if (l.right.type === DiffType.REMOVED) {
                deletions++;
            }
        }
        const totalChanges = deletions + additions;
        const percentageAddition = Math.round((additions / totalChanges) * 100);
        const blocks = [];
        for (let i = 0; i < 5; i++) {
            if (percentageAddition > i * 20) {
                blocks.push(_jsx("span", { className: cn(this.styles.block, this.styles.blockAddition) }, i));
            }
            else {
                blocks.push(_jsx("span", { className: cn(this.styles.block, this.styles.blockDeletion) }, i));
            }
        }
        const allExpanded = this.state.expandedBlocks.length === nodes.blocks.length;
        return (_jsxs("div", { children: [_jsxs("div", { className: this.styles.summary, role: "banner", children: [_jsx("button", { type: "button", className: this.styles.allExpandButton, onClick: () => {
                                this.setState({
                                    expandedBlocks: allExpanded
                                        ? []
                                        : nodes.blocks.map((b) => b.index),
                                });
                            }, children: allExpanded ? _jsx(Fold, {}) : _jsx(Expand, {}) }), " ", totalChanges, _jsx("div", { style: { display: "flex", gap: "1px" }, children: blocks }), this.props.summary ? _jsx("span", { children: this.props.summary }) : null] }), _jsx("table", { className: cn(this.styles.diffContainer, {
                        [this.styles.splitView]: splitView,
                    }), onMouseUp: () => {
                        const elements = document.getElementsByClassName("right");
                        for (let i = 0; i < elements.length; i++) {
                            const element = elements.item(i);
                            element.classList.remove(this.styles.noSelect);
                        }
                        const elementsLeft = document.getElementsByClassName("left");
                        for (let i = 0; i < elementsLeft.length; i++) {
                            const element = elementsLeft.item(i);
                            element.classList.remove(this.styles.noSelect);
                        }
                    }, children: _jsxs("tbody", { children: [_jsxs("tr", { children: [!this.props.hideLineNumbers ? _jsx("td", { width: "50px" }) : null, !splitView && !this.props.hideLineNumbers ? (_jsx("td", { width: "50px" })) : null, this.props.renderGutter ? _jsx("td", { width: "50px" }) : null, _jsx("td", { width: "28px" }), _jsx("td", { width: "100%" }), splitView ? (_jsxs(_Fragment, { children: [!this.props.hideLineNumbers ? _jsx("td", { width: "50px" }) : null, this.props.renderGutter ? _jsx("td", { width: "50px" }) : null, _jsx("td", { width: "28px" }), _jsx("td", { width: "100%" })] })) : null] }), leftTitle || rightTitle ? (_jsxs("tr", { children: [_jsx("th", { colSpan: splitView ? colSpanOnSplitView : colSpanOnInlineView, className: cn(this.styles.titleBlock, this.styles.column), children: leftTitle ? (_jsx("pre", { className: this.styles.contentText, children: leftTitle })) : null }), splitView ? (_jsx("th", { colSpan: colSpanOnSplitView, className: cn(this.styles.titleBlock, this.styles.column), children: rightTitle ? (_jsx("pre", { className: this.styles.contentText, children: rightTitle })) : null })) : null] })) : null, nodes.diffNodes] }) })] }));
    };
}
export default DiffViewer;
export { DiffMethod };
