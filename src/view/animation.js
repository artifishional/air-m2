

export default class Animation {

    constructor(gr, { frames }) {
        this.gr = gr;
        this.frames = new Schema(frames);
        this._cache = [];
    }

    /**
     * [ "frame-name", { duration: (ms) }
     *      [ 0 (%), { x: 100, y: 100 } ],
     *      [ 20 (%), { x: 100, y: 200 } ],
     *      [ 100 (%), { x: 200, y: 100 } ],
     * ]
     * @param schema
     * @param complete
     */
    action( schema, complete ) {
        const [ name, { duration }, [_, startAt], ...keys ] =
            this.frames.find(schema[0]).merge(schema).toJSON();
        const existIndex = this._cache.findIndex( (_, _name) => name === _name );
        if(existIndex > -1) {
            this._cache[existIndex].kill();
            this._cache.splice(existIndex, 1);
        }
        const tl = new TimelineMax({
            tweens: keys
                .map( ([to, props], i, arr) => [ to - (arr[i-1] ? arr[i-1][0] : 0) / 100, props ] )
                .map( ([range, props]) => new TweenMax(this.gr, duration / range, { startAt, ...props }) ),
            align: "sequence",
            onComplete: complete
        });
        this._cache.push( [ name, tl ] );
    }

    clear() {
        this._cache.map( ([_, tl]) => tk.kill() );
    }

}