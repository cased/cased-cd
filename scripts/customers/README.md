# Customer Management for Cased CD Enterprise

⚠️ **IMPORTANT**: This directory is NOT in version control! It contains sensitive customer tokens.

## Quick Start

### 1. Create a Fine-Grained GitHub PAT

1. Log in to **your** GitHub account (that owns `cased` org)
2. Go to Settings → Developer settings → Personal access tokens → Fine-grained tokens
3. Click "Generate new token"
4. Configure:
   - **Token name**: `customer-acme-corp` (use customer name)
   - **Expiration**: 1 year (or custom)
   - **Resource owner**: `cased` (your organization)
   - **Repository access**: Select "Public Repositories (read-only)" (most restrictive)
     - *Note: This doesn't affect package access, just use the most restrictive option*
   - **Permissions** → **Account permissions**:
     - **Packages**: `Read-only` ⚠️ **This is the key permission for GHCR**
5. Click "Generate token"
6. Copy the token: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 2. Add Customer

```bash
./scripts/customers/manage.sh add \
  "Acme Corp" \
  "admin@acme.com" \
  "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

This will:
- Add customer to tracking database
- Generate installation instructions
- Display them ready to send

### 3. Send Instructions

The script outputs ready-to-send instructions. Just copy/paste and email to the customer.

## Commands

### List all customers
```bash
./scripts/customers/manage.sh list
```

### Generate install instructions
```bash
./scripts/customers/manage.sh instructions "Acme Corp"
```

### Show token for revocation
```bash
./scripts/customers/manage.sh token "Acme Corp"
```

### Revoke customer access
```bash
./scripts/customers/manage.sh revoke "Acme Corp"
```

This marks them as revoked and shows which token to delete on GitHub.

## Data Storage

Customer data is stored in `~/.cased-cd-customers.json` (outside project directory):

```json
{
  "customers": [
    {
      "name": "Acme Corp",
      "email": "admin@acme.com",
      "token": "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "added_date": "2025-01-15T10:30:00Z",
      "status": "active"
    }
  ]
}
```

**Security**: File is created with `chmod 600` (owner read/write only).

## Security Best Practices

1. **Never commit customer tokens** - data stored in `~/.cased-cd-customers.json` (outside project)
2. **Backup customers.json** to a secure location (1Password, encrypted drive)
3. **Rotate tokens** every 6-12 months
4. **Use unique tokens** per customer for easier revocation and tracking
5. **Name tokens descriptively** on GitHub (e.g., `customer-acme-corp`)
6. **Package-scoped tokens** - these tokens can ONLY pull the enterprise image, nothing else

## Token Revocation

When a customer churns:

1. Run: `./scripts/customers/manage.sh revoke "Acme Corp"`
2. Go to [GitHub Settings → Fine-grained tokens](https://github.com/settings/tokens?type=beta)
3. Find the token for the customer (e.g., `customer-acme-corp`)
4. Click Delete
5. Confirm deletion

The customer can no longer pull enterprise images. Existing running pods continue until restarted.

## Troubleshooting

**Customer can't pull image:**
- Check token is correct (format: `ghp_...`)
- Verify token has "Packages: Read-only" permission
- Verify token is scoped to `cased` organization
- Verify `imagePullSecrets` is set in Helm values
- Check token hasn't been revoked on GitHub
- Check token hasn't expired

**Script errors:**
- Requires `jq` installed: `brew install jq`
- Make sure you have correct permissions on `~/.cased-cd-customers.json`
