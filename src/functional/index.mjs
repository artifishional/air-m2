export const prop = name => ({
    eq: value => obj => obj[name] === value
});