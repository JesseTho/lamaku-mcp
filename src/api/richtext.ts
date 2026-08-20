/**
 * Rich text on Brightspace is not one shape, it is three, and which one an
 * endpoint accepts is not derivable from the API version or the product code.
 * This was established empirically against lamaku.hawaii.edu (le 1.96) by
 * creating and deleting a real object on each route:
 *
 *   RichTextInput  {Content, Type}   grades, content modules, dropbox folders
 *   RichText       {Text, Html}      discussion forums, news items
 *
 * Sending the wrong one yields a bare HTTP 400 "Invalid Parameters" with no
 * hint as to which field is at fault, so the shape is pinned per endpoint here
 * rather than guessed at the call site.
 */

export type RichTextInput = { Content: string; Type: 'Text' | 'Html' };
export type RichTextPair = { Text: string | null; Html: string | null };

const looksLikeHtml = (s: string): boolean => /<[a-z][\s\S]*>/i.test(s);

/** {Content, Type} — grades, content modules, dropbox folders. */
export function asInput(body: string | null | undefined): RichTextInput {
  const text = body ?? '';
  return { Content: text, Type: looksLikeHtml(text) ? 'Html' : 'Text' };
}

/**
 * {Text, Html} — discussion forums and news items.
 *
 * D2L is explicit that the unused half must be null, not an empty string:
 * passing Html:"" alongside text is rejected rather than treated as "no HTML".
 */
export function asPair(body: string | null | undefined): RichTextPair {
  const text = body ?? '';
  return looksLikeHtml(text)
    ? { Text: null, Html: text }
    : { Text: text, Html: null };
}
