# air-m2

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

## Template engine

the simplest template component has the form:

```html

<div m2 = '["component-name", { frames: [ [ "update-action-name" ] ] }]'>

    <!-- ...other static content ...-->
    
    <span>${argv}</span>
    <span>static text ${argv.name}</span>

</div>

```