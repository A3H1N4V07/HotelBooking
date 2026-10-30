// Our schemas are written in Gemini's OpenAPI style ({ type, nullable: true }).
// OpenAI-compatible providers (Groq) expect standard JSON Schema, where
// "nullable" is spelled as a type union with "null".
function toJsonSchema(schema) {
  const { nullable, ...rest } = schema;
  const out = { ...rest };

  if (rest.type === "object") {
    out.properties = Object.fromEntries(
      Object.entries(rest.properties || {}).map(([key, value]) => [key, toJsonSchema(value)])
    );
    out.additionalProperties = false;
  }

  if (rest.type === "array" && rest.items) {
    out.items = toJsonSchema(rest.items);
  }

  if (nullable) {
    out.type = [rest.type, "null"];
    if (Array.isArray(rest.enum)) out.enum = [...rest.enum, null];
  }

  return out;
}

module.exports = { toJsonSchema };
