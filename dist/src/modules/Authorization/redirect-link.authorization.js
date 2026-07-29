export class RedirectLinkAuthentication {
    link;
    constructor(link) {
        this.link = link;
    }
    authorize(isPasswordVerified) {
        if (!this.link.isActive) {
            return `/link/inactive?code=${this.link.shortCode}`;
        }
        if (this.link.clickLimit !== -1 &&
            this.link.clickCount + 1 > this.link.clickLimit) {
            return `/link/limit-reached?code=${this.link.shortCode}`;
        }
        if (this.link.passwordHash && !isPasswordVerified) {
            return `/link/password?code=${this.link.shortCode}`;
        }
    }
}
//# sourceMappingURL=redirect-link.authorization.js.map