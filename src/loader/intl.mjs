export default (resourceloader, {path}, {url}) => resourceloader(resourceloader, {path}, {url, type: 'json'})
    .then(({content: raw}) => {
      let formatters = [];
        let customCurrency = [];
        // TODO: obsolete format sup
        if(Array.isArray(raw)) {
          formatters = raw
            .slice(1)
            .reduce((acc, next) => {
              acc[next[0]] = next[1];
              return acc;
            }, {});
        }
        else {
          ({ formatters, "custom-currency": customCurrency} = raw)
        }
        return { type: "intl", content: formatters, precached: new Precached(formatters, customCurrency) };
    });

class Precached {

  constructor(formatters, customCurrency) {
    this.formatters = formatters;
    this.customCurrency = customCurrency;
    this.customCurrencyCode = customCurrency.map(({ code }) => code);
    this.cache = new Map();
  }

  get(locale, currency) {
    if(!this.cache.has(locale)) {
      this.cache.set(locale, new Map());
    }
    if(!this.cache.get(locale).has(currency)) {
      this.cache.get(locale).set(
        currency,
        Object.keys(this.formatters)
          .reduce( (acc, name) => {
            const options = this.formatters[name];
            const formatter =
              new Intl.NumberFormat(locale, {
                currency: this.customCurrencyCode.includes(currency) ? "usd" : currency, ... options
              });
            acc[name] = (value) => {
              if(value === undefined) {
                return "";
              }
              if(isNaN(+value)) {
                return formatter.format(0).replace("0", value);
              }
              // patch on chrome at ~78
              // UAH currency symbol is not displayed
              // while it works correctly in the firefox
              if(currency === "uah" && options.style === "currency") {
                return formatter.format(value).replace("грн.", "₴");
              }
              else {
                if(options.style === "currency") {
                  const idx = this.customCurrencyCode.indexOf(currency);
                  if(idx > -1) {
                    const customCurrency = this.customCurrency[idx];
                    return formatter.format(value).replace("$", customCurrency.symbol);
                  }
                }
              }
              return formatter.format(value);
            };
            return acc;
        }, {})
      );
    }
    return this.cache.get(locale).get(currency);
  }

}