import stream from "./xhr"

export default ({url, revision}) => stream({path: url, revision, content: { type: "application/json" }})
    .map( xhr => {
        const formatters = JSON.parse(xhr.responseText).slice(1);
        return { type: "intl", content: formatters, precached: new Precached(formatters) };
    } );


class Precached {
  
  constructor(formatters) {
    this.formatters = formatters;
    this.cache = new Map();
  }
  
  get(locale, currency) {
    if(!this.cache.has(locale)) {
      this.cache.set(locale, new Map());
    }
    if(!this.cache.get(locale).has(currency)) {
      this.cache.get(locale).set(
        currency,
        this.formatters.reduce( (acc, [ name, options ]) => {
          const formatter =
            new Intl.NumberFormat(locale, {
              currency: currency === "000" ? "usd" : currency, ... options
            });
          acc[name] = (value) => {
            if(value === undefined) {
              return "";
            }
            if(isNaN(+value)) {
              return formatter.format(0).replace( "0", value );
            }
            // patch on chrome at ~78
            // UAH currency symbol is not displayed
            // while it works correctly in the firefox
            if(currency === "uah" && options.style === "currency") {
              return formatter.format(value).replace("грн.", "₴");
            }
            else if(currency === "000" && options.style === "currency") {
              return formatter.format(value).replace("$", "BB");
            }
            return formatter.format(value);
          };
          return acc;
        } , {} )
      );
    }
    return this.cache.get(locale).get(currency);
  }
  
}