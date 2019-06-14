# m2

## Inline plugging

#### view plugin

the simplest plug-in has the form:

```html
<unit>
    <view-source> 
 ```
 
 ```js
import { stream } from "m2"
 
export default ({ source/*, targets */}) => {
        return stream( (emt, { over }) => {
            over.add(source.on((evt, src) => {
                emt(evt, src);
            }));
        } );
    }
```
 
```html
    </view-source>
</unit>
```

#### stream plugin

you can also modify the data stream before use:

```html
<unit>
    <stream-source> 
 ```
 
 ```js
import { stream } from "m2"
 
export default ({ obtain }) => 
	obtain().map( data => [data] )
```
 
```html
    </stream-source>
</unit>
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

##### Animation

```html
<keyframe [name = default] [prop = {easing:"linear",duration:5}] >
    <key [offset = 0] prop = {scale:0}></key>
    <key [offset = 1] prop = {scale:1}></key>
</keyframe>
``` 

inline fade-in fade-out supported
```html
<keyframe name = fade-in [duration = 5]>
    <key [offset = 0] prop = {translateX:0}></key>
    <key [offset = 1] prop = {translateX:100}></key>
</keyframe>
``` 

binding data from stream
```html
<keyframe name = fade-in [duration = 5]>
    <key prop = {scaleX:(x)}></key>
</keyframe>
``` 
```js 
[{x: 1.5}]
```

##### Inline (local) CSS styles & SASS

```html
<unit>
   <style [type="text/scss"]> <!-- to enable SASS processing -->
```
```style
    body { /* global selector */
        padding: 0;
        margin: 0;
    }
    
    :scope { /* local selector */
        width: 100%;
        background-color: #0026ff;
        height: 100%;
    }
```
```html
   </style>
   <div></div>
</unit>
```

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

```html
<keyframe name="animation-name" prop="{duration: -1, sound: 'sound-name'}" ></keyframe>
```
Sound will be played once

or

```html
<keyframe name="animation-name" prop="{duration: 2}">
    <key offset="0.2" prop={sound:'sound-name'} ></key>
    <key offset="0.7" prop={sound:'sound-name'} ></key>
</keyframe>

```
Sounds will be played 2 times with certain offsets and will be stopped if duration of animation less than duration of sounds 

, where 
- ```sound``` - name of resource declared in ```<sound>``` tag

Sound resource declaration
```html
<sound name="sound-name" rel="sound-resource"></sound>
```
, where 
- ```name``` - name of resource
- ```rel``` - file name without extension from the directory
``` component/res/sounds/sound-resource ```

if you want to use the general sounds for components, you can go up the nesting levels

```rel="../../sound-resource"```

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
- ``` "onpointerup" ```
- ``` "onpointerdown" ```
- ``` "onchange" ```
- ``` "oninput" ```
- ``` "onglobalkeydown" (synthetic)```
- ``` "onglobalkeyup" (synthetic)```
- ``` "onkeydown" ```
- ``` "onkeyup" ```
- ``` "onwheel" ```
- ``` "onscroll" ```

    also supported custom events

- ``` "on:custom-event" ```

    [Creating and triggering events in JavaScript](https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Creating_and_triggering_events)
    
```html
<view-source>
```
```
import { stream } from "m2"

        class MyEvent extends Event {
            constructor() {
                super("my-event");
                this.myData = 100;
            }
            log() {
                console.log("check", this);
            }
        }

        export default ({ source, targets }) => {
            return stream( (emt, { over }) => {

                over.add(source.on((evt, src) => {

                    setTimeout( () => {
                        targets[0].node.dispatchEvent(new MyEvent());
                    }, 1000);

                    emt(evt, src);

                }));
            } );
        }
``` 
```</view-source>``` 

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
- ``` "./@component-key" ``` - search by key
