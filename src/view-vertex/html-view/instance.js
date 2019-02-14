export default class Instance extends iInstance {
/*
    constructor( owner, { stream: { model, view, update }, targets }) {
        super( owner, { stream: { model, view, update }, targets } );

        this.view = view;
        this.owner = owner;
        this.update = update;

        this.stream = { model, view };
        this.targets = targets;

    }*/

    stream(emt, { sweep }) {

        //todo transform stream here if needed
        //this.update = this.update;

        sweep.add(this.update.at( ( evt ) => {



        } ));

    }


}