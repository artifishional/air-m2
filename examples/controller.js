export default function loto({advantages, id, rng}) {

    return advantages
        .obtain( {route: "route" } )
            /*...*/

        //only for controller reaction
        .controller( function ( {action, event, data} ) {

            if(action === "some-action") {
                //все что возвращает эта функция пойдет выше по стеку
                return {  };
            }

        } )

}


/**

 событие с контроллера попадает на сервис


 с сервиса идет рассылка неподтвержденного изменения

 затем после подтверждения идет рассылка complete



 */



