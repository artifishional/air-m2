import { stream2 as stream } from 'air-stream';
import { ENTRY_UNIT } from '../../globals';
import StylesController from './styles-controller';
import {
	routeNormalizer,
	signature as signatureEquals,
	removeElementFromArray, pickFromPath,
} from '../../utils';
import JSON5 from 'json5';
import { LiveSchema } from '../../live-schema';
import { NODE_TYPES } from './def';
import { Layer } from './layer';
import PlaceHolderContainer from './place-holder-container';
import ActiveNodeTarget from './active-node-target';
import { ModelVertex } from '../../model-vertex';
import resourceloader from '../../loader/resource-loader';
import CachedNodeVertex from './cached-node-vertex';

let UNIQUE_VIEW_KEY = 0;

class Cached {

	constructor({ constructor }) {
		this.__cache = [];
		this.constructor = constructor;
	}

	createIfNotExist( data, signature ) {
		let exist = this.__cache.find( ({ signature: x }) => signatureEquals(signature, x) );
		if(!exist) {
			exist = { signature, cell: this.constructor(data, data) };
			this.__cache.push(exist);
		}
		return exist.cell;
	}

}

export default class HTMLView extends LiveSchema {
	constructor( args, src, { acid } = {} ) {
		super( args, src, { acid } );

		this.resourceloader = src.resourceloader;

		this.prop.preload = this.prop.preload !== undefined ? this.prop.preload : true;
		this.prop.stream = this.prop.stream || "";
		this.prop.resources = this.prop.resources || [];
		this.prop.handlers = this.prop.handlers || [];
		this.prop.teeF = this.prop.teeF || null;
		this.prop.plug = this.prop.plug || [];
		this.prop.label = this.prop.label || "";
		this.prop.styles = this.prop.styles || [];
		this.prop.streamplug = this.prop.streamplug || [];
		this.prop.keyframes = this.prop.keyframes || [];
		this.prop.node = this.prop.node || document.createDocumentFragment();
	}

	static createApplicationRoot( { path = ENTRY_UNIT, resourceloader = HTMLView.resourceloader } ) {
		return new HTMLView( ["$", { use: [{ path, schtype: "html" }] }], { resourceloader }, );
	}

	createActiveNodeTarget(node, resources) {
		return new ActiveNodeTarget(this, node, resources);
	}

	findByLabel(label) {
		if(this.layers.some(({ prop: { label: x } }) => x === label)) {
			return this;
		}
		else {
			for(let i = 0; i < this.item.length; i ++ ) {
				const res = this.item[i].findByLabel(label);
				if(res) {
					return res;
				}
			}
		}
		return null;
	}
	
	toJSON() {
		return 'HTMLView';
	}
/*
	createKitLayer( { $: { modelschema,
		layers: layers = new Map( [ [ -1, { layer: modelschema, vars: {} } ] ] ) },
		signature: parentContainerSignature = null,
		...args
	} ) {
		return stream.fromCbFn((cb, ctr) => {
			const container = new PlaceHolderContainer(this, { type: "kit" });
			//todo need layers sup
			const modelvertex = layers.get(this.acid) || layers.get(-1);
			const modelstream = modelvertex.layer.obtain("", modelvertex.vars);
			const cache = new Cached({
				constructor: (data) => {
					const signature = calcsignature(data, this.prop.kit.prop);
					const modelvertex = new ModelVertex(["$$", {
						glassy: true,
						source: () => modelstream.map(([state]) => {
							const childs = pickFromPath(state, this.prop.kit.pick);
							const res = childs.find( child => signatureEquals(signature, child) );
							return res !== undefined ? [res] : EMPTY;
						})
							.distinct(equal)
					}], {resourceloader: this.resourceloader});
					let sign;
					if(typeof signature !== "object") {
						sign = { default: signature };
					}
					else {
						sign = signature;
					}
					modelvertex.parent = (layers.get(this.acid) || layers.get(-1)).layer;
					const _layers = new Map([ ...layers, [this.acid, { layer: modelvertex, vars: {} } ]]);
					const res = this.createTeeEntity(
						{ signature: {...sign, $: parentContainerSignature }, ...args },
						{ layers: _layers }
					);
					return res;
				}
			});
			ctr.todisconnect(() => cache.clear());
			const store = [];
			ctr.todisconnect(modelstream.get(({ value: [state] }) => {
				let childs;
				try {
					childs = pickFromPath(state, this.prop.kit.pick);
				}
				catch (e) {
					return;
				}
				let domTreePlacment = container.begin;
				const deleted = [...store];
				childs.map(child => {
					const signature = calcsignature(child, this.prop.kit.prop);
					const exist = store.find( ({ signature: $ }) => signatureEquals(signature, $ ) );
					if (!exist) {
						const box = new PlaceHolderContainer(this, { type: "item" });
						domTreePlacment.after(box.target);
						domTreePlacment = box.end;
						store.push({ signature, box });
						cache.createIfNotExist( child, signature )
							.get(({ value: { container } }) => {
								container.restore();
								box.append(container.target);
							});
					} else {
						removeElementFromArray(deleted, exist);
						if(exist.box.begin !== domTreePlacment.nextSibling) {
							exist.box.restore();
							domTreePlacment.after(exist.box.target);
						}
						domTreePlacment = exist.box.end;
					}
				});
				deleted.map( item => {
					const deleted = store.indexOf(item);
					//store.splice(deleted, 1);
					item.box.restore();
				});
			}));
			cb({
				stages: [],
				container,
				src: this,
				get acids() { throw new Error('Deprecation err'); },// acids: this.layers.map(({acid}) => acid),
				get acid() { throw new Error('Deprecation err'); },// acid: this.acid,
				get key() { throw new Error('Deprecation err'); }, // key: this.key,
				get target() { throw new Error('Deprecation err'); },// target: container.target
			});
		})
      .store();
	}
*/
	
	
	
	createKitLayer( { $: { modelschema,
		layers: layers = new Map( [ [ -1, { layer: modelschema, vars: {} } ] ] ) },
		                signature: parentContainerSignature = null,
		                ...args
	                } ) {
		return stream.fromCbFn((cb, ctr) => {
			const container = new PlaceHolderContainer(this, { type: "kit" });
			//todo need layers sup
			const modelvertex = layers.get(this.acid) || layers.get(-1);
			const modelstream = modelvertex.layer.obtain("", modelvertex.vars);
			const cache = new Cached({
				constructor: (source) => {
					const signature = source;
					const modelvertex = new ModelVertex(["$$", {
						glassy: true,
						source: () => {
							// TODO: HACK: Permanent VM getter
							source.get();
							return source
						},
					}], { resourceloader: this.resourceloader });
					modelvertex.parent = (layers.get(this.acid) || layers.get(-1)).layer;
					const _layers = new Map([ ...layers, [this.acid, { layer: modelvertex, vars: {} } ]]);
					const res = this.createTeeEntity(
						{ signature: { id: source.id, $: parentContainerSignature }, ...args },
						{ layers: _layers }
					);
					return res;
				}
			});
			ctr.todisconnect(() => cache.clear());
			const store = [];
			ctr.todisconnect(modelstream.get(({ value }) => {
				let childs;
				try {
					childs = pickFromPath(value, this.prop.kit.pick);
				}
				catch (e) {
					return;
				}
				let domTreePlacment = container.begin;
				const deleted = [...store];
				childs.map((child) => {
					const signature = child;
					const exist = store.find(({ signature: $ }) => signature === $);
					if (!exist) {
						const box = new PlaceHolderContainer(this, { type: "item" });
						domTreePlacment.after(box.target);
						domTreePlacment = box.end;
						store.push({ signature, box });
						const viewItemStream = cache.createIfNotExist(child, signature);
						viewItemStream.get(({ value: { container, stages } }) => {
							// TODO: Temporary solution
							//s.connect();
							stages.forEach((s) => s.get());
							container.restore();
							box.append(container.target);
						});
					} else {
						removeElementFromArray(deleted, exist);
						if(exist.box.begin !== domTreePlacment.nextSibling) {
							exist.box.restore();
							domTreePlacment.after(exist.box.target);
						}
						domTreePlacment = exist.box.end;
					}
				});
				deleted.map((item) => {
					const deleted = store.indexOf(item);
					//store.splice(deleted, 1);
					item.box.restore();
				});
			}));
			cb({
				stages: [],
				container,
				src: this,
				get acids() { throw new Error('Deprecation err'); },// acids: this.layers.map(({acid}) => acid),
				get acid() { throw new Error('Deprecation err'); },// acid: this.acid,
				get key() { throw new Error('Deprecation err'); }, // key: this.key,
				get target() { throw new Error('Deprecation err'); },// target: container.target
			});
		})
			.store();
	}
	
	
	
	createEntity(args, {
		modelschema,
		layers: layers = new Map([[ -1, { layer: modelschema, vars: {} }]])
	}) {
		this.prop.acids = this.layers.map(({acid}) => acid);
		return stream((onrdy, ctr) => {
			const clayers = new Map(
				this.layers.map(
					({ acid: _acid, src: { acid }, prop: { streamplug, stream } }, i, arr) => {
						let layer = null;
						let vars = null;
						let resultStreamPath = "";
						if(stream[0] === "^") {
							const eLayer =
								arr.slice(0, i).find( ({ prop: { stream } }) => stream[0] !== "^" );
							if(!eLayer) {
								throw `the first view layer cannot refer to the predecessor stream`
							}
							const { src: { acid }, prop: { stream: pstream } } = eLayer;
							//stream inheritance
							if(pstream === "" && !stream.substr(1)) {
								resultStreamPath = stream;
								({ layer, vars } = layers.get(acid));
								//vars = layers.get(acid).vars;
							}
							else {
								resultStreamPath = pstream + stream.substr(1);
								layer = (layers.get(acid) || layers.get(-1)).layer;
								vars = routeNormalizer(pstream + stream.substr(1))[1];
							}
						}
						else if(stream === "") {
							resultStreamPath = stream;
							({ layer, vars } = layers.get(acid) || layers.get(-1) ||
									//todo hack - unresolved stream source path
									[...layers][0][1]
							);
						}
						else {
							resultStreamPath = stream;
							layer = (layers.get(acid) || [...layers][0][1]).layer;
							vars = routeNormalizer(stream)[1];
						}
						layer = streamplug.reduce( (acc, source) => {
							const res = new ModelVertex(["$$", { glassy: true, source }], {
								resourceloader: this.resourceloader
							});
							res.parent = acc;
							return res;
						}, layer);
						return [_acid, { layer: layer.get(resultStreamPath), vars }];
					})
			);
			Promise.all([...clayers].map(([, { layer }]) => layer))
				.then( layers => new Map([ ...clayers].map(([acid, { vars }], i) => [
					acid, { layer: layers[i], vars }
				])))
				.then(layers => {
					if(this.layers.some(({ prop: { kit } }) => kit)) {
						this.createKitLayer({ $: { layers }, ...args })
							.connect((wsp, hook) => {
								ctr.to(hook);
								onrdy(wsp);
							});
					}
					else {
						this.createTeeEntity(args, { layers })
							.connect((wsp, hook) => {
								ctr.to(hook);
								onrdy(wsp);
							});
					}
				});
		} );
	}

	createLayer(modelLayer, targets, args) {
	  /* <debug> */
		if(!targets || !targets.length) {
      throw 'Empty targets unsupported now';
		}
    /* </debug> */
    return new Layer(this, modelLayer, targets, args);
	}
	
	createNextLayers(args, { layers }) {
		return stream
			.fromFn(() => {
				const literal = this.layers.find(layer => layer.prop.literal);
				if (literal) {
					literal.prop.keyframes = this.layers.map(layer => layer.prop.keyframes).flat();
				}
				return [
					this.createChildrenEntity(args, { layers }),
					...this.layers.map((layer) => layer.createNodeEntity()),
				]
			})
			.combineAllFirst()
			.map(([children, ...comps]) => {
				const rlayers = [];
				const container = new PlaceHolderContainer(this, { type: "layers" });
				const state = {
					src: this,
					container,
				};
				container.append(...comps.map(({container: {target}}) => target));
				rlayers.push(...this.layers
					.map((layer, i) => {
						const targets = [
							...container.targets("sounds", comps[i].resources),
							...comps[i].container.targets("datas", comps[i].resources),
							...container.targets("actives", comps[i].resources)
						];
						if (targets.length) {
							return layer.createLayer(layers.get(layer.acid), targets, args);
						}
						return null;
					})
					.filter(Boolean)
				);
				const slots = container.slots();
				if (children.length) {
					if (slots.length) {
						children.map(({ container: { target }, src: { prop: { acids } } }) => {
							const place = slots
								.filter(({acid}) => acids.includes(acid))
								.reduce((exist, { slot }) => {
									if (!exist) {
										exist = slot;
									} else if (
										exist.parentNode.nodeType !== NODE_TYPES.ELEMENT_NODE &&
										slot.parentNode.nodeType === NODE_TYPES.ELEMENT_NODE
									) {
										exist.remove();
										exist = slot;
									} else {
										slot.remove();
									}
									return exist;
								}, null);
							place.replaceWith(target);
						});
					} else {
						container.append(...children.map(({ container: { target } }) => target));
					}
				}
				//todo hack clear unused slots ( when cross template mix to exmpl )
				slots.map(({slot}) => slot.remove());
				const targets = [...container.targets("actives", [])];
				if (targets.length) {
					this.prop.styles.forEach(({idx}) => {
						targets.forEach(({node}) => {
							node.setAttribute(`data-style-acid-${idx}`, "");
						});
					});
				}
				const childrenStages = children.map(({ stages }) => stages).flat();
				return {
					...state,
					get acids() { throw new Error('Deprecation err'); },// acids: this.layers.map(({acid}) => acid),
					get acid() { throw new Error('Deprecation err'); },// acid: this.acid,
					get key() { throw new Error('Deprecation err'); }, // key: this.key,
					get target() { throw new Error('Deprecation err'); },// target: container.target
					stages: [...childrenStages, ...rlayers.map(({ stream }) => stream).filter(Boolean)],
				};
			});
	}

	createNodeEntity() {
		return stream
			.combine([
				...this.prop.resources,
				...this.prop.styles.map(({ style, idx }, priority) => {
					priority = +(style.getAttribute("priority") || priority);
					return StylesController.get(style, idx, priority, this.prop.pack, this.resourceloader)
				})
			])
			.map((resources) => {
				const container = new PlaceHolderContainer(this, { type: "node" });
				if (this.layers.every(layer => !layer.prop.literal) || this.prop.literal) {
					container.append(this.prop.node.cloneNode(true));
				}
				const imgs = resources.filter(({type}) => type === "img");
				[...container.target.querySelectorAll(`slot[img]`)]
					.map((target, i) => {
						const key = +target.getAttribute("img");
						const { image } = imgs.find(img => img.key === key);
						target.replaceWith(image.cloneNode(true))
					});
				return { resources, container };
			});
	}
	
	teeFSignatureCheck(layers) {
		return this.layers.every(({ acid, prop: { teeF } }) =>
			teeF ? teeF(layers.get(acid), this.key) : true
		);
	}
	
	lazyTeeEntityStrategy(container, view, viewStage, model, layers) {
		const loader = this.obtain("@loader", { }, { layers });
		return stream.extendedCombine([
			container,
			model,
			loader,
			loader.gripFirst(HTMLView.gripStageProJ),
			view,
			viewStage,
		], ([container, tee, loader, loaderStageVl, view = null, viewStageVl = -1]) => {
			const transition = { loader: null, view: null };
			if (!view && tee && (loaderStageVl === 0 || loaderStageVl === 2)) {
				container.append(loader.container.target);
				transition.loader = 'fade-in';
			} else if (view && tee && loaderStageVl === 1) {
				transition.loader = 'fade-out';
			} else if(!tee || view && loaderStageVl === 0) {
				loader.container.restore();
			}
			if (loaderStageVl === 0 && tee && view && (viewStageVl === 0 || viewStageVl === 2)) {
				container.append(view.container.target);
				transition.view = 'fade-in';
			} else if(!tee && view && viewStageVl === 1) {
				transition.view = 'fade-out';
			} else if (!tee && view && viewStageVl === 0) {
				view.container.restore();
			}
			return { transition, on: tee || viewStageVl > 0 };
		}, {
			tuner: (tuner, { transition, on }) => {
				tuner.setup([[view, { on }], [viewStage, { on }]]);
				if (transition.loader) {
					tuner.get(3).hook(transition.loader);
				}
				if (transition.view) {
					tuner.get(5).hook(transition.view);
				}
			}
		})
	}
	
	static get staticStage0stream() {
		if (!this.$zeroStageStream) {
			this.$zeroStageStream = stream.fromFn(() => 0);
		}
		return this.$zeroStageStream;
	}
	
	staticTeeEntityStrategy(container, view, viewStage, model) {
		return stream.extendedCombine([
			container,
			model,
			view,
			viewStage,
		], ([container, tee, view, viewStageVl]) => {
			let transition = '';
			if (tee && (viewStageVl === 0 || viewStageVl === 2)) {
				container.append(view.container.target);
				transition = 'fade-in';
			} else if(!tee && viewStageVl === 1) {
				transition = 'fade-out';
			} else if (!tee && viewStageVl === 0) {
				view.container.restore();
			}
			return { transition };
		}, {
			tuner: (tuner, { transition }) => {
				if (transition) {
					tuner.get(3).hook(transition);
				}
			}
		});
	}
	
	static gripStageProJ({ stages }) {
		if (stages.length) {
			return stream.combine(
				stages,
				(states) => {
					const firstChildStage = states[0];
					if (states.some((stage) => stage !== firstChildStage)) {
						return -1;
					}
					return firstChildStage;
				},
				{ ctrMode: 'all' }
			);
		} else {
			return HTMLView.staticStage0stream;
		}
	}
	
	createTeeEntity(args, manager) {
		if (!this.layers.some(({ prop: { teeF } }) => teeF) && this.prop.preload) {
			return this.createNextLayers(args, manager);
		}
		const { layers } = manager;
		const container = stream.fromFn(() => {
			return new PlaceHolderContainer(this, { type: "entity" });
		});
		const teeFLayers = this.layers
			.filter(({ prop: { teeF } }) => teeF)
			.map(({ acid }) => acid);
		const teeFStreamLayers = new Map([...layers]
			.filter(([acid]) => teeFLayers.includes(acid)));
		const view = this.createNextLayers(args, { layers });
		const viewStage = view.gripFirst(HTMLView.gripStageProJ);
		const model = stream.combine(
			[...teeFStreamLayers]
				.map(([, { layer, vars }]) => layer.obtain("", vars)),
			(...layers) => layers.map((ly) => Array.isArray(ly) ? ly[0] : ly)
		).map((data) => {
			return this.teeFSignatureCheck(
				new Map([...teeFStreamLayers].map(([ acid ], i) => [acid, data[i][0]]))
			);
		});
		let res;
		if (this.prop.preload) {
			res = this.staticTeeEntityStrategy(container, view, viewStage, model, layers);
		} else {
			res = this.lazyTeeEntityStrategy(container, view, viewStage, model, layers);
		}
		return container
			.controller(res)
			.map((container) => {
				return {
					src: this,
					container,
					stages: [],
					get acids() { throw new Error('Deprecation err'); },// acids: this.layers.map(({acid}) => acid),
					get acid() { throw new Error('Deprecation err'); },// acid: this.acid,
					get key() { throw new Error('Deprecation err'); }, // key: this.key,
					get target() { throw new Error('Deprecation err'); },// target: container.target
				};
			});
	}

	createChildrenEntity(args, { layers }) {
		return stream.combine(this.item
			.filter(({ prop: { template } }) => !template)
			.map(x => x._obtain([], args, { layers }))
		);
	}
	
	parse(node, src, pkj ) {
		return this.constructor.parse(node, src, pkj);
	}
	
	static parse( node, src, { pack, type = "unit" } ) {
		if(!(node instanceof Element)) {
			return new HTMLView(["", {}], src, {createEntity: node});
		}
		if(!pack.cache.proto) {
			const comments = document.createTreeWalker(node, NodeFilter.SHOW_COMMENT);
			while(comments.nextNode()) comments.currentNode.remove();
			pack.cache.proto = CachedNodeVertex.parse(node, src, {pack, type});
		}
		return pack.cache.proto.map(src, (src, vertex) => {
			let uvk = `${++UNIQUE_VIEW_KEY}`;
			const { path = "./", key: pkey = uvk } = (src || {}).prop || {};
			let key = vertex.prop.rawKey;
			if(key !== null) {
				if(/[`"'{}\]\[]/.test(key)) {
					key = JSON5.parse(key);
				}
				uvk = key;
			}
			else {
				key = pkey;
			}
			const resources = [
				...(src.acid !== -1 && src.prop.resources || []),
				...vertex.prop.resources.map(x => stream.fromPromise(src.resourceloader(src.resourceloader, pack, x))),
			];
			/* TODO HACK */
			vertex.prop.styles.forEach( ({style}) => {
				style.pack = pack;
			} );
			/* TODO HACK */
			const node = vertex.prop.node.cloneNode(true);
			const stream = vertex.prop.stream
				.replace("$key", JSON.stringify(key))
				.replace(/(\/|^)"([^\/]+)"(\/|$)/g, '$1$2$3');
			const prop = {
				...vertex.prop,
				rawTee: null,
				rawKey: null,
				key,            //inherited or inner key
				resources,
				stream,
				path,           // absolute path
				type,           // view node type [node -> unit, switcher -> tee]
				pack,           // current package
				node,           // xml target node
			};
			const res = src.acid !== -1 && src.lift([uvk, prop], src) ||
				new HTMLView([uvk, prop], src);
			if(!vertex.prop.template && src.prop) {
				const slot = src.prop.node.querySelector('slot[acid="-"]');
				slot && slot.setAttribute("acid", res.acid);
			}
			return res;
		});
	}
	
	mergeProperties( name, value ) {
		if(name === "stream") {
			return this.prop.stream;
		}
		else if(name === "useOwnerProps") {
			if(!value) {
				return false;
			}
			else {
				return this.prop.useOwnerProps;
			}
		}
		else if(name === "preload") {
			if(!value) {
				return false;
			}
			else {
				return this.prop.preload;
			}
		}
		else if(name === "controlled") {
			return value || this.prop.controlled;
		}
		else if(name === "styles") {
			return [ ...this.prop.styles, ...value.filter( style => !this.prop.styles.includes(style) ) ];
		}
		else if(name === "resources") {
			return [ ...this.prop.resources, ...value ]
				.reduce((acc, next) => acc.includes(next) ? acc : [ ...acc, next ], []);
		}
		/*else if(name === "template") {
			return this.prop.template || value;
		}*/
		/*else if( name == "tee" ) {
			return [ ...this.prop.tee, ...value];
		}*/
		else if([
			"literal",
			"label",
			"streamplug",
			"plug",
			"kit",
			"key",
			"teeF",
			"template",
			"handlers",
			"keyframes",
			"node",
			"pack",
			"source"
		].includes(name)) {
			return this.prop[name];
		}
		else {
			return super.mergeProperties( name, value );
		}
	}
	
}

HTMLView.resourceloader = resourceloader;