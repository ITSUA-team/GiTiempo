export class SessionContextChangedError extends Error {
  constructor() {
    super("Your session changed. Please try again.");
    this.name = "SessionContextChangedError";
  }
}
