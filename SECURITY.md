# Security Policy

## Security Disclaimer

VEXE is a selfbot management tool. **Using selfbots violates Discord's Terms of Service.** By using this software, you acknowledge the risks:

- **Account Termination**: Discord regularly bans accounts using selfbots
- **Loss of Access**: Your account and any associated data may be permanently deleted
- **No Recourse**: Discord does not provide appeals for ToS violations
- **Legal Liability**: Users are solely responsible for compliance with Discord's ToS and applicable laws

**This tool is provided for educational purposes only. Users assume full responsibility for how they use it.**

---

## Reporting Security Vulnerabilities

If you discover a security vulnerability in VEXE, please report it responsibly **without publicly disclosing the issue**.

### Reporting Process

1. **Do NOT create a public GitHub issue** for security vulnerabilities
2. Email your findings to the project maintainers with:
   - Description of the vulnerability
   - Steps to reproduce (if applicable)
   - Potential impact
   - Suggested fix (if you have one)
3. Include your GitHub username if you'd like attribution
4. Allow 48-72 hours for initial response

### What to Report

We take security seriously. Report issues like:

- **Token Exposure**: Ways tokens could be leaked or logged
- **Database Security**: SQLite access vulnerabilities
- **Voice Adapter Exploits**: Unsafe voice connection handling
- **Process Injection**: CLI argument injection or code execution vectors
- **Privilege Escalation**: Unintended access to other accounts
- **File System Issues**: Unsafe file operations or permissions

### What NOT to Report

- General Discord API questions
- How to extract tokens (this is documented)
- Feature requests or enhancements
- Configuration issues
- Third-party library vulnerabilities (report to upstream maintainers)

---

## Security Best Practices for Users

### Token Security

- ✅ Store tokens in `.env` files (add to `.gitignore`)
- ✅ Rotate tokens regularly
- ✅ Use throwaway/secondary accounts only
- ✅ Never commit tokens to version control
- ✅ Never share tokens in chat, logs, or screenshots
- ❌ Don't hardcode tokens in code
- ❌ Don't paste tokens in unsecured terminals
- ❌ Don't use the same token across machines

### Database Security

- ✅ Keep `storage.sqlite` out of backups
- ✅ Set restrictive file permissions: `chmod 600 storage.sqlite`
- ✅ Don't sync database to cloud services
- ✅ Encrypt sensitive backups
- ❌ Don't share database files
- ❌ Don't upload to repositories

### Deployment Security

- ✅ Use PM2 with environment variables for sensitive data
- ✅ Run on secure, isolated machines
- ✅ Regularly update Node.js and dependencies
- ✅ Monitor logs for suspicious activity
- ✅ Use VPN if running on public networks
- ❌ Don't expose CLI to untrusted networks
- ❌ Don't run with root/admin privileges
- ❌ Don't disable security features

### Code Security

- ✅ Review code before running
- ✅ Use verified versions from GitHub
- ✅ Keep dependencies updated
- ✅ Check package.json for malicious dependencies
- ❌ Don't run untrusted forks
- ❌ Don't disable npm package verification
- ❌ Don't use pre-release versions in production

---

## Known Risks

### Discord ToS Violations

This tool uses selfbots, which are explicitly against Discord's Terms of Service. Known risks:

1. **Account Bans**: Permanent termination without appeal
2. **IP Bans**: Potential IP-level restrictions
3. **Guild Bans**: Associated servers may ban the account
4. **Rate Limiting**: Discord may aggressively throttle requests
5. **Detection**: Discord actively detects and targets selfbot usage

### Technical Risks

1. **Voice Connection Instability**: Discord frequently changes voice protocol
2. **API Changes**: Discord API updates may break functionality without notice
3. **Token Exposure**: Tokens stored in SQLite are at risk if file is compromised
4. **Process Management**: PM2 processes may not gracefully handle disconnects
5. **Cascading Failures**: One account's ban may affect others

---

## Vulnerability Response

We aim to respond to all security reports within **48-72 hours**.

### Response Timeline

1. **Initial Response**: Acknowledge receipt and review
2. **Assessment**: Determine severity and impact
3. **Remediation**: Develop fix or workaround
4. **Notification**: Alert users to update if critical
5. **Patch Release**: Deploy fix as soon as possible

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|----------------|
| Critical | Token exposure, code execution, data loss | 24 hours |
| High | Privilege escalation, account takeover | 48 hours |
| Medium | Information disclosure, denial of service | 72 hours |
| Low | Theoretical vulnerabilities, edge cases | 1 week |

---

## Dependency Security

We depend on:

- **discord.js** - Maintained by Discord community
- **@discordjs/voice** - Voice protocol handling
- **sequelize** - ORM for SQLite
- **yargs** - CLI argument parsing
- **winston** - Logging

All dependencies should be monitored for vulnerabilities using:

```bash
npm audit
npm audit fix
```

---

## Security Checklist for Contributors

If contributing security-related changes:

- [ ] Do not hardcode tokens or secrets
- [ ] Validate all user inputs
- [ ] Use environment variables for sensitive config
- [ ] Document security implications
- [ ] Add comments for non-obvious security decisions
- [ ] Test error handling for edge cases
- [ ] Review for injection vulnerabilities
- [ ] Check for unintended logging of sensitive data

---

## Compliance Notes

VEXE does not comply with Discord's Terms of Service by design. Users are fully responsible for understanding and accepting the legal implications of using this tool.

### Legal Disclaimer

Use of this software implies acceptance that:
- You are violating Discord's Terms of Service
- You accept the risk of account termination
- You hold the developer(s) harmless for any consequences
- You comply with all applicable laws and regulations
- You use this tool only on accounts you own

---

## Questions?

- **Security Issues**: Do not open GitHub issues
- **General Questions**: See README or CONTRIBUTING.md
- **Discussions**: Use GitHub Discussions for non-security topics

---

*Last Updated: 2024*
*Security Policy Version: 1.0*
