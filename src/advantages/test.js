import {schemasNormalizer, routeNormalizer} from "./index";

describe('advantages', function () {

    describe('schemasNormalizer', function () {

        it('simple', function () {
            chai.expect(schemasNormalizer( ["key"] )).to.deep.equal([ "key", {} ]);
        });

        it('nested', function () {
            chai.expect(schemasNormalizer( ["key", [ "key2", ["key3"], ["key4"] ], ["key5"]] ))
                .to.deep.equal([ "key", {}, [ "key2", {}, [ "key3", {} ], ["key4", {} ] ], ["key5", {}] ]);
        });

        it('nested with props', function () {
            chai.expect(schemasNormalizer( ["key", {prop1: 10}, [ "key2", ["key3", {prop2: 10}], ["key4"] ], ["key5"]] ))
                .to.deep.equal([ "key", {prop1: 10}, [ "key2", {}, [ "key3", {prop2: 10} ], ["key4", {} ] ], ["key5", {}] ]);
        });

    });

    describe('routeNormalizer', function () {

        it('simple', function () {
            chai.expect(routeNormalizer( "././../../state/some/{type: data, id: 156}" ))
                .to.deep.equal(["..", "..", "state", "some", {type: "data", id: 156} ]);
        });

    });

});