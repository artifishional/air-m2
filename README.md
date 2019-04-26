# m2

## Plugging

the simplest plug-in has the form:

```js
import { stream } from "m2"

export default () => stream((emt, { hook }) => {

    const target = document.createElement("div");
    target.textContent = "this is a plugin";

    //when the component is fully loaded and ready to work
    emt( { action: "complete", node: { target } } );

    //controller
    hook.add( ({action}) => {
        emt( { action: `${action}-complete`,  } );
    } );

});
```

## View engine

### Simple

#### Templates definition

data transmission from events
```html
<span>{(property)}</span>
``` 

the event source must have the form

```js 
[{property: 77}]
```

the data source can be an object with a nested structure

```html
<span>{(somefield.nested)}</span>
``` 

```js 
[{somefield: {nested: 77} }]
```

formatting

```html
<span>{intl.formatter-resource-name,{property}}</span>
``` 

,where ```{property}``` - data transmission template

the event source must have the form

```js 
[{property: 77}]
```

localization

```html
<span>{lang.localization-string-resource-name}</span>
``` 

#### Actions definition

##### Class controllers



```html
<keyframe>
    <key prop = {classList:{active:(isactive)}}></key>
</keyframe>
``` 

```js 
[{isactive: true}]
```

or

```html
<keyframe>
    <key prop = {classList:{red|green|black:(selectedColor)}}></key>
</keyframe>
``` 

```js 
[{selectedColor: "red"}]
```

##### Sound controls

you can use sounds in frames

```js
/*<div m2 = '["name", */
{ frames: [
    [ "action-name", { duration: -1/*immediately*/, sound: "my-sound" }, ],
    /*...*/
]}
/*]'></div>*/
```

or

```js
/*<div m2 = '["name", */
{ frames: [
    [ "action-name", { duration: 1 }, 
       [50, { sound: "my-sound" }],
       [100, { sound: "my-sound2" }]
     ],
    /*...*/
]}
/*]'></div>*/
```

, where 
- ```sound``` - file name without extension from the directory ``` component/res/sounds ```

if you want to use the general sounds for components, you can go up the nesting levels

```sound: "../../my-sound"```


if you are going to transfer the name of the sound from the model, you must specify it in the resources used

```js
/*<div m2 = '["name", */
{ 
    resources: [ { type: "sound", rel: "my-sound", name: "alias-name" } ]
    frames: [ [ "action-name" ] ]
}
/*]'></div>*/
```

, where 
- ```rel``` - file name without extension from the directory ``` component/res/sounds ```
- ```name``` - name to be transferred from the model, to example:

``` [ "action-name", { sound: "alias-name" } ] ```

#### Reactions definition

```html
<unit onclick = req("action-name",{/*args*/})></unit>
``` 

where environment variables:
- req - stream fallback method
- key - view-component name
- options - current view-component options
- event - system event data

###### List of supported events

- ``` "onclick" ```
- ``` "onclickoutside" (synthetic)```
- ``` "onpointermove" ```
- ``` "onpointerenter" ```
- ``` "onpointerleave" ```
- ``` "onglobalkeydown" (synthetic)```
- ``` "onglobalkeyup" (synthetic)```
- ``` "onkeydown" ```
- ``` "onkeyup" ```
- ``` "onwheel" ```

### Switcher

selects one view state available according to the model.

```html
<unit tee = {a:10,b:-1}></unit>
``` 

rendered to the page if the condition when mapping data from the stream is fully met


```js 
[{a: 10, b: -1, ...other}]
```

or not rendered

```js 
[{a: 10, b: -2, ...other}]
```

allowed to use attachments and abbreviated forms
```html
<unit tee = {obj:{prop}}></unit>
``` 

```js 
[{obj: {prop: 1}}]
```

### Common features

#### Coupling with model

you can link your view to the stream to get actions and process reactions

```html
<unit stream = ./path>
``` 

any relative path will be calculated relative to the parent view, which is related to the model.

you can use the constant ``` $name ``` as a parameter to pass the current name of the view to the model

```html
<unit stream = ./path/to/model[key=$name]>
``` 

#### Submodules

you can use the included submodules

```html
<unit use = url(./path-to-src-module)></unit>
```

or

```html
<unit use = ./path-to-registered-module></unit>
```

## Model unit

each model is a function that returns a stream:

it is a new stream

```js
import { stream } from "m2"

export default ( { /*...args*/ } ) => 
    stream(emt => {
        emt( "something" );
    })
```
, where 
- stream - ["air-stream"](https://github.com/artifishional/air-stream) object "stream"

or an existing converted stream

```js
import { stream } from "m2"

export default ( { obtain, /*...args*/ } ) => 
    obtain("../some/existing-stream/path")
    .map( count => count + 1 )
    .controller( 
        obtain("../some/existing-stream-controller/path"),
        ({action}) => ({ action, data: "ok" })
    )
```

, where 
- obtain - method of accessing an existing model from the schema
- args - init options that were specified when accessing the stream

can be specified in the "obtain" method

```js
obtain("./path", { argv: 10 })
```

or right on the path 
```js
obtain("./path[argv=10]")
```

## Paths

the simplest path has the form:

``` "./cat-a/cat-b/cat-c" ```

###### Supported features
- ``` "./cat-a" ``` - entry to the directory
- ``` "./" ``` - current directory
- ``` "../" ``` - parent directory
- ``` "./{name: abc, kind: 10}" ``` - directories with a complex name
- ``` "./cat-a[kind=10]" ``` - passing arguments
- ``` "./#component-id" ``` - search by id
