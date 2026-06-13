export async function parseAiError(res: Response): Promise<string> {
  const json = await res.json().catch(() => ({}));
  if (res.status === 429) {
    return (
      (json as { message?: string }).message ??
      "Monthly AI limit reached. Check Settings for usage."
    );
  }
  return "Failed to generate — try again";
}
