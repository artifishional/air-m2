/**
 * Добавить как только будет доступен
 * @param advantages
 * @param parent
 * @param conf
 */
export default function (advantages, { root }, parent) {

    advantages.get( root, function ( [ name, { creator, gr: { creator: grcreator } } ]) {
        const gr = new grcreator();
        const res = new creator( gr );
        parent.append(res);
    } )

}