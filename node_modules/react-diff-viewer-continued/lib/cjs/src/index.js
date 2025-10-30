"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiffMethod = exports.LineNumberPrefix = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const classnames_1 = __importDefault(require("classnames"));
const React = __importStar(require("react"));
const memoize_one_1 = __importDefault(require("memoize-one"));
const compute_hidden_blocks_js_1 = require("./compute-hidden-blocks.js");
const compute_lines_js_1 = require("./compute-lines.js");
Object.defineProperty(exports, "DiffMethod", { enumerable: true, get: function () { return compute_lines_js_1.DiffMethod; } });
const expand_js_1 = require("./expand.js");
const styles_js_1 = __importDefault(require("./styles.js"));
const fold_js_1 = require("./fold.js");
var LineNumberPrefix;
(function (LineNumberPrefix) {
    LineNumberPrefix["LEFT"] = "L";
    LineNumberPrefix["RIGHT"] = "R";
})(LineNumberPrefix || (exports.LineNumberPrefix = LineNumberPrefix = {}));
class DiffViewer extends React.Component {
    constructor(props) {
        super(props);
        /**
         * Resets code block expand to the initial stage. Will be exposed to the parent component via
         * refs.
         */
        this.resetCodeBlocks = () => {
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
        this.onBlockExpand = (id) => {
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
        this.computeStyles = (0, memoize_one_1.default)(styles_js_1.default);
        /**
         * Returns a function with clicked line number in the closure. Returns an no-op function when no
         * onLineNumberClick handler is supplied.
         *
         * @param id Line id of a line.
         */
        this.onLineNumberClickProxy = (id) => {
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
        this.renderWordDiff = (diffArray, renderer) => {
            return diffArray.map((wordDiff, i) => {
                const content = renderer
                    ? renderer(wordDiff.value)
                    : (typeof wordDiff.value === 'string'
                        ? wordDiff.value
                        // If wordDiff.value is DiffInformation, we don't handle it, unclear why. See c0c99f5712.
                        : undefined);
                return wordDiff.type === compute_lines_js_1.DiffType.ADDED ? ((0, jsx_runtime_1.jsx)("ins", { className: (0, classnames_1.default)(this.styles.wordDiff, {
                        [this.styles.wordAdded]: wordDiff.type === compute_lines_js_1.DiffType.ADDED,
                    }), children: content }, i)) : wordDiff.type === compute_lines_js_1.DiffType.REMOVED ? ((0, jsx_runtime_1.jsx)("del", { className: (0, classnames_1.default)(this.styles.wordDiff, {
                        [this.styles.wordRemoved]: wordDiff.type === compute_lines_js_1.DiffType.REMOVED,
                    }), children: content }, i)) : ((0, jsx_runtime_1.jsx)("span", { className: (0, classnames_1.default)(this.styles.wordDiff), children: content }, i));
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
        this.renderLine = (lineNumber, type, prefix, value, additionalLineNumber, additionalPrefix) => {
            const lineNumberTemplate = `${prefix}-${lineNumber}`;
            const additionalLineNumberTemplate = `${additionalPrefix}-${additionalLineNumber}`;
            const highlightLine = this.props.highlightLines.includes(lineNumberTemplate) ||
                this.props.highlightLines.includes(additionalLineNumberTemplate);
            const added = type === compute_lines_js_1.DiffType.ADDED;
            const removed = type === compute_lines_js_1.DiffType.REMOVED;
            const changed = type === compute_lines_js_1.DiffType.CHANGED;
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
            return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [!this.props.hideLineNumbers && ((0, jsx_runtime_1.jsx)("td", { onClick: lineNumber && this.onLineNumberClickProxy(lineNumberTemplate), className: (0, classnames_1.default)(this.styles.gutter, {
                            [this.styles.emptyGutter]: !lineNumber,
                            [this.styles.diffAdded]: added,
                            [this.styles.diffRemoved]: removed,
                            [this.styles.diffChanged]: changed,
                            [this.styles.highlightedGutter]: highlightLine,
                        }), children: (0, jsx_runtime_1.jsx)("pre", { className: this.styles.lineNumber, children: lineNumber }) })), !this.props.splitView && !this.props.hideLineNumbers && ((0, jsx_runtime_1.jsx)("td", { onClick: additionalLineNumber &&
                            this.onLineNumberClickProxy(additionalLineNumberTemplate), className: (0, classnames_1.default)(this.styles.gutter, {
                            [this.styles.emptyGutter]: !additionalLineNumber,
                            [this.styles.diffAdded]: added,
                            [this.styles.diffRemoved]: removed,
                            [this.styles.diffChanged]: changed,
                            [this.styles.highlightedGutter]: highlightLine,
                        }), children: (0, jsx_runtime_1.jsx)("pre", { className: this.styles.lineNumber, children: additionalLineNumber }) })), this.props.renderGutter
                        ? this.props.renderGutter({
                            lineNumber,
                            type,
                            prefix,
                            value,
                            additionalLineNumber,
                            additionalPrefix,
                            styles: this.styles,
                        })
                        : null, (0, jsx_runtime_1.jsx)("td", { className: (0, classnames_1.default)(this.styles.marker, {
                            [this.styles.emptyLine]: !content,
                            [this.styles.diffAdded]: added,
                            [this.styles.diffRemoved]: removed,
                            [this.styles.diffChanged]: changed,
                            [this.styles.highlightedLine]: highlightLine,
                        }), children: (0, jsx_runtime_1.jsxs)("pre", { children: [added && "+", removed && "-"] }) }), (0, jsx_runtime_1.jsx)("td", { className: (0, classnames_1.default)(this.styles.content, {
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
                                : undefined, children: (0, jsx_runtime_1.jsx)(ElementType, { className: this.styles.contentText, children: content }) })] }));
        };
        /**
         * Generates lines for split view.
         *
         * @param obj Line diff information.
         * @param obj.left Life diff information for the left pane of the split view.
         * @param obj.right Life diff information for the right pane of the split view.
         * @param index React key for the lines.
         */
        this.renderSplitView = ({ left, right }, index) => {
            return ((0, jsx_runtime_1.jsxs)("tr", { className: this.styles.line, children: [this.renderLine(left.lineNumber, left.type, LineNumberPrefix.LEFT, left.value), this.renderLine(right.lineNumber, right.type, LineNumberPrefix.RIGHT, right.value)] }, index));
        };
        /**
         * Generates lines for inline view.
         *
         * @param obj Line diff information.
         * @param obj.left Life diff information for the added section of the inline view.
         * @param obj.right Life diff information for the removed section of the inline view.
         * @param index React key for the lines.
         */
        this.renderInlineView = ({ left, right }, index) => {
            let content;
            if (left.type === compute_lines_js_1.DiffType.REMOVED && right.type === compute_lines_js_1.DiffType.ADDED) {
                return ((0, jsx_runtime_1.jsxs)(React.Fragment, { children: [(0, jsx_runtime_1.jsx)("tr", { className: this.styles.line, children: this.renderLine(left.lineNumber, left.type, LineNumberPrefix.LEFT, left.value, null) }), (0, jsx_runtime_1.jsx)("tr", { className: this.styles.line, children: this.renderLine(null, right.type, LineNumberPrefix.RIGHT, right.value, right.lineNumber, LineNumberPrefix.RIGHT) })] }, index));
            }
            if (left.type === compute_lines_js_1.DiffType.REMOVED) {
                content = this.renderLine(left.lineNumber, left.type, LineNumberPrefix.LEFT, left.value, null);
            }
            if (left.type === compute_lines_js_1.DiffType.DEFAULT) {
                content = this.renderLine(left.lineNumber, left.type, LineNumberPrefix.LEFT, left.value, right.lineNumber, LineNumberPrefix.RIGHT);
            }
            if (right.type === compute_lines_js_1.DiffType.ADDED) {
                content = this.renderLine(null, right.type, LineNumberPrefix.RIGHT, right.value, right.lineNumber);
            }
            return ((0, jsx_runtime_1.jsx)("tr", { className: this.styles.line, children: content }, index));
        };
        /**
         * Returns a function with clicked block number in the closure.
         *
         * @param id Cold fold block id.
         */
        this.onBlockClickProxy = (id) => () => this.onBlockExpand(id);
        /**
         * Generates cold fold block. It also uses the custom message renderer when available to show
         * cold fold messages.
         *
         * @param num Number of skipped lines between two blocks.
         * @param blockNumber Code fold block id.
         * @param leftBlockLineNumber First left line number after the current code fold block.
         * @param rightBlockLineNumber First right line number after the current code fold block.
         */
        this.renderSkippedLineIndicator = (num, blockNumber, leftBlockLineNumber, rightBlockLineNumber) => {
            const { hideLineNumbers, splitView } = this.props;
            const message = this.props.codeFoldMessageRenderer ? (this.props.codeFoldMessageRenderer(num, leftBlockLineNumber, rightBlockLineNumber)) : ((0, jsx_runtime_1.jsxs)("span", { className: this.styles.codeFoldContent, children: ["Expand ", num, " lines ..."] }));
            const content = ((0, jsx_runtime_1.jsx)("td", { className: this.styles.codeFoldContentContainer, children: (0, jsx_runtime_1.jsx)("button", { type: "button", className: this.styles.codeFoldExpandButton, onClick: this.onBlockClickProxy(blockNumber), tabIndex: 0, children: message }) }));
            const isUnifiedViewWithoutLineNumbers = !splitView && !hideLineNumbers;
            return ((0, jsx_runtime_1.jsxs)("tr", { className: this.styles.codeFold, children: [!hideLineNumbers && (0, jsx_runtime_1.jsx)("td", { className: this.styles.codeFoldGutter }), this.props.renderGutter ? ((0, jsx_runtime_1.jsx)("td", { className: this.styles.codeFoldGutter })) : null, (0, jsx_runtime_1.jsx)("td", { className: (0, classnames_1.default)({
                            [this.styles.codeFoldGutter]: isUnifiedViewWithoutLineNumbers,
                        }) }), isUnifiedViewWithoutLineNumbers ? ((0, jsx_runtime_1.jsxs)(React.Fragment, { children: [(0, jsx_runtime_1.jsx)("td", {}), content] })) : ((0, jsx_runtime_1.jsxs)(React.Fragment, { children: [content, this.props.renderGutter ? (0, jsx_runtime_1.jsx)("td", {}) : null, (0, jsx_runtime_1.jsx)("td", {}), (0, jsx_runtime_1.jsx)("td", {}), !hideLineNumbers ? (0, jsx_runtime_1.jsx)("td", {}) : null] }))] }, `${leftBlockLineNumber}-${rightBlockLineNumber}`));
        };
        /**
         * Generates the entire diff view.
         */
        this.renderDiff = () => {
            const { oldValue, newValue, splitView, disableWordDiff, compareMethod, linesOffset, } = this.props;
            const { lineInformation, diffLines } = (0, compute_lines_js_1.computeLineInformation)(oldValue, newValue, disableWordDiff, compareMethod, linesOffset, this.props.alwaysShowLines);
            const extraLines = this.props.extraLinesSurroundingDiff < 0
                ? 0
                : Math.round(this.props.extraLinesSurroundingDiff);
            const { lineBlocks, blocks } = (0, compute_hidden_blocks_js_1.computeHiddenBlocks)(lineInformation, diffLines, extraLines);
            const diffNodes = lineInformation.map((line, lineIndex) => {
                if (this.props.showDiffOnly) {
                    const blockIndex = lineBlocks[lineIndex];
                    if (blockIndex !== undefined) {
                        const lastLineOfBlock = blocks[blockIndex].endLine === lineIndex;
                        if (!this.state.expandedBlocks.includes(blockIndex) &&
                            lastLineOfBlock) {
                            return ((0, jsx_runtime_1.jsx)(React.Fragment, { children: this.renderSkippedLineIndicator(blocks[blockIndex].lines, blockIndex, line.left.lineNumber, line.right.lineNumber) }, lineIndex));
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
        this.render = () => {
            const { oldValue, newValue, useDarkTheme, leftTitle, rightTitle, splitView, compareMethod, hideLineNumbers, nonce, } = this.props;
            if (typeof compareMethod === "string" &&
                compareMethod !== compute_lines_js_1.DiffMethod.JSON) {
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
                if (l.left.type === compute_lines_js_1.DiffType.ADDED) {
                    additions++;
                }
                if (l.right.type === compute_lines_js_1.DiffType.ADDED) {
                    additions++;
                }
                if (l.left.type === compute_lines_js_1.DiffType.REMOVED) {
                    deletions++;
                }
                if (l.right.type === compute_lines_js_1.DiffType.REMOVED) {
                    deletions++;
                }
            }
            const totalChanges = deletions + additions;
            const percentageAddition = Math.round((additions / totalChanges) * 100);
            const blocks = [];
            for (let i = 0; i < 5; i++) {
                if (percentageAddition > i * 20) {
                    blocks.push((0, jsx_runtime_1.jsx)("span", { className: (0, classnames_1.default)(this.styles.block, this.styles.blockAddition) }, i));
                }
                else {
                    blocks.push((0, jsx_runtime_1.jsx)("span", { className: (0, classnames_1.default)(this.styles.block, this.styles.blockDeletion) }, i));
                }
            }
            const allExpanded = this.state.expandedBlocks.length === nodes.blocks.length;
            return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: this.styles.summary, role: "banner", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: this.styles.allExpandButton, onClick: () => {
                                    this.setState({
                                        expandedBlocks: allExpanded
                                            ? []
                                            : nodes.blocks.map((b) => b.index),
                                    });
                                }, children: allExpanded ? (0, jsx_runtime_1.jsx)(fold_js_1.Fold, {}) : (0, jsx_runtime_1.jsx)(expand_js_1.Expand, {}) }), " ", totalChanges, (0, jsx_runtime_1.jsx)("div", { style: { display: "flex", gap: "1px" }, children: blocks }), this.props.summary ? (0, jsx_runtime_1.jsx)("span", { children: this.props.summary }) : null] }), (0, jsx_runtime_1.jsx)("table", { className: (0, classnames_1.default)(this.styles.diffContainer, {
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
                        }, children: (0, jsx_runtime_1.jsxs)("tbody", { children: [(0, jsx_runtime_1.jsxs)("tr", { children: [!this.props.hideLineNumbers ? (0, jsx_runtime_1.jsx)("td", { width: "50px" }) : null, !splitView && !this.props.hideLineNumbers ? ((0, jsx_runtime_1.jsx)("td", { width: "50px" })) : null, this.props.renderGutter ? (0, jsx_runtime_1.jsx)("td", { width: "50px" }) : null, (0, jsx_runtime_1.jsx)("td", { width: "28px" }), (0, jsx_runtime_1.jsx)("td", { width: "100%" }), splitView ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [!this.props.hideLineNumbers ? (0, jsx_runtime_1.jsx)("td", { width: "50px" }) : null, this.props.renderGutter ? (0, jsx_runtime_1.jsx)("td", { width: "50px" }) : null, (0, jsx_runtime_1.jsx)("td", { width: "28px" }), (0, jsx_runtime_1.jsx)("td", { width: "100%" })] })) : null] }), leftTitle || rightTitle ? ((0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { colSpan: splitView ? colSpanOnSplitView : colSpanOnInlineView, className: (0, classnames_1.default)(this.styles.titleBlock, this.styles.column), children: leftTitle ? ((0, jsx_runtime_1.jsx)("pre", { className: this.styles.contentText, children: leftTitle })) : null }), splitView ? ((0, jsx_runtime_1.jsx)("th", { colSpan: colSpanOnSplitView, className: (0, classnames_1.default)(this.styles.titleBlock, this.styles.column), children: rightTitle ? ((0, jsx_runtime_1.jsx)("pre", { className: this.styles.contentText, children: rightTitle })) : null })) : null] })) : null, nodes.diffNodes] }) })] }));
        };
        this.state = {
            expandedBlocks: [],
            noSelect: undefined,
        };
    }
}
DiffViewer.defaultProps = {
    oldValue: "",
    newValue: "",
    splitView: true,
    highlightLines: [],
    disableWordDiff: false,
    compareMethod: compute_lines_js_1.DiffMethod.CHARS,
    styles: {},
    hideLineNumbers: false,
    extraLinesSurroundingDiff: 3,
    showDiffOnly: true,
    useDarkTheme: false,
    linesOffset: 0,
    nonce: "",
};
exports.default = DiffViewer;
