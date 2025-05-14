
// Export for usage in Zotero object
var LegalReferenceGetter = (function(){
  async function pullSSRNData(item) {
    const ssrnUrl = item.getField('url');
    const resp = await fetch(ssrnUrl);
    const text = await resp.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    const data = {
      "reference": Array.from(doc.querySelectorAll(".reference-info > p")).map((e) => e.innerText),
      "authors": Array.from(doc.querySelectorAll(".authors > h2")).map((e) => e.innerText),
      "title": doc.querySelector("h1").innerText,
      "date": Array.from(doc.querySelectorAll("span")).map((e) => e.innerText.trim()).filter((e)=>e.startsWith("Last revised:"))[0].replace("Last revised: ", '').trim()
    }
    return data;
  }
})();
