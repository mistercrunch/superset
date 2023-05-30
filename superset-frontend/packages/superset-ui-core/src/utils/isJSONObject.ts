export default function isJSONObject(str: string): boolean {
  try {
    let parsed: any = JSON.parse(str);
    return (
      typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
    );
  } catch (e) {
    return false;
  }
}
