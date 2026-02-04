export interface UpdateHandler {
  handleUpdate: (update: unknown) => Promise<unknown>;
}
