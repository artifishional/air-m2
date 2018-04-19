export default function reducer( {advantages} ) {




    advantages
        .obtain( [`./../../server`, `./tracer`] )
        .withHandler( (emt, evt, src) => {

            if(src.type === "reinit" && !evt) {
                emt( src );
            }

        } );

}