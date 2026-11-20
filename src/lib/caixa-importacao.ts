export function financialImportAmount(value:unknown):number{
  if(typeof value==="number")return value;
  let text=String(value??"").trim().replace(/^R\$\s*/,"").replace(/\s/g,"");
  if(text.includes(","))text=text.replace(/\./g,"").replace(",",".");
  else if(/^\d{1,3}(\.\d{3})+$/.test(text))text=text.replace(/\./g,"");
  return Number(text);
}
export function financialImportDate(value:unknown):string|null{
  if(value===null||value===undefined||value==="")return null;
  if(value instanceof Date&&!Number.isNaN(value.getTime()))return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,"0")}-${String(value.getDate()).padStart(2,"0")}`;
  const text=String(value).trim();const match=text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);const date=match?`${match[3]}-${match[2]}-${match[1]}`:text;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(`${date}T12:00:00Z`).toISOString().slice(0,10)!==date)throw new Error("Data inválida.");
  return date;
}