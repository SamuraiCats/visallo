define([
    'create-react-class',
    'prop-types',
    './OpenLayers',
    './clusterHover',
    './util/layerHelpers',
    'configuration/plugins/registry',
    'components/RegistryInjectorHOC',
    'util/vertex/formatters',
    'util/deepObjectCache',
    'util/mapConfig'
], function(
    createReactClass,
    PropTypes,
    OpenLayers,
    clusterHover,
    layerHelpers,
    registry,
    RegistryInjectorHOC,
    F,
    DeepObjectCache,
    mapConfig) {
    'use strict';

    const REQUEST_UPDATE_DEBOUNCE = 300;

    /**
     * @deprecated Use {@link org.visallo.product.toolbar.item} instead
     */
    registry.documentExtensionPoint('org.visallo.map.options',
        'Add components to the map options toolbar',
        function(e) {
            return ('identifier' in e) && ('optionComponentPath' in e);
        },
        'http://docs.visallo.org/extension-points/front-end/mapOptions'
    );

    /**
     * Extension to style map features/pins using the
     * [OpenLayers](http://openlayers.org)
     * [`ol.style.Style`](http://openlayers.org/en/latest/apidoc/ol.style.Style.html)
     * api.
     *
     * This does not change clustered features.
     *
     * @param {org.visallo.map.style~canHandle} canHandle Function that
     * determines if style function applies for elements.
     * @param {org.visallo.map.style~style} style Style to use for feature
     * @param {org.visallo.map.style~style} selectedStyle Style to use when feature is selected
     * @example
     * registry.registerExtension('org.visallo.map.style', {
     *     canHandle: function(productEdgeInfo, element) {
     *         return element.properties.length > 2;
     *     },
     *     style: function(productEdgeInfo, element) {
     *         const fill = new ol.style.Fill({ color: '#ff0000' })
     *         const stroke = new ol.style.Stroke({ color: '#0000ff', width: 2 })
     *         return new ol.style.Style({
     *             image: new ol.style.Circle({
     *                 fill: fill,
     *                 stroke: stroke,
     *                 radius: 25
     *             })
     *         })
     *     }
     * });
     */
    registry.documentExtensionPoint('org.visallo.map.style',
        'Style map features using OpenLayers',
        function(e) {
            return _.isFunction(e.canHandle) && (_.isFunction(e.style) || _.isFunction(e.selectedStyle))
        },
        'http://docs.visallo.org/extension-points/front-end/mapStyle'
    );
    registry.markUndocumentedExtensionPoint('org.visallo.map.style');

    /**
     * Extension to customize geometry of map features/pins using the
     * [OpenLayers](http://openlayers.org)
     * [`ol.geom.Geometry`](http://openlayers.org/en/latest/apidoc/ol.geom.Geometry.html)
     * api.
     *
     * @param {org.visallo.map.geometry~canHandle} canHandle Function that
     * determines if geometry function applies for elements.
     * @param {org.visallo.map.geometry~geometry} geometry Geometry to use for feature
     * @param {string} [layerPosition=below] The id of the existing layer this feature is placed in //TODO
     * @example
     * require(['openlayers'], function(ol) {
     *     registry.registerExtension('org.visallo.map.geometry', {
     *         canHandle: function(productEdgeInfo, element, ontology) {
     *             return element.properties.length > 2;
     *         },
     *         geometry: function(productEdgeInfo, element, ontology) {
     *             const { lon, lat } = getGeo(element)
     *             return new ol.geom.Point(ol.proj.fromLonLat([lon, lat]))
     *         }
     *     });
     * })
     */
    registry.documentExtensionPoint('org.visallo.map.geometry',
        'Change map geometries using OpenLayers',
        function(e) {
            return _.isFunction(e.canHandle) && _.isFunction(e.geometry) &&
                (!e.layer || (_.isObject(e.layer) & (_.isString(e.layer.id)) && _.isString(e.layer.type)))
        },
        'http://docs.visallo.org/extension-points/front-end/mapGeometry'
    );
    registry.markUndocumentedExtensionPoint('org.visallo.map.geometry');


    /**
     * Extension to initialize [layers](http://openlayers.org/en/latest/apidoc/ol.layer.Layer.html) on the map
     */
    registry.documentExtensionPoint('org.visallo.map.layer',
        'Initialize layers on the map',
        function(e) {
            return (_.isString(e.id)
                && _.isString(e.type)
                && (!e.configure || _.isFunction(e.configure))
                && (!e.addEvents || _.isFunction(e.addEvents))
                && (!e.update || _.isFunction(e.update))
                && (!e.shouldUpdate || _.isFunction(e.shouldUpdate))
                && (!e.options || _.isObject(e.options))
            );
        },
        'http://docs.visallo.org/extension-points/front-end/mapLayers'
    );
    registry.markUndocumentedExtensionPoint('org.visallo.map.layer');

    const Map = createReactClass({

        propTypes: {
            configProperties: PropTypes.object.isRequired,
            onUpdateViewport: PropTypes.func.isRequired,
            onSelectElements: PropTypes.func.isRequired,
            onVertexMenu: PropTypes.func.isRequired,
            elements: PropTypes.shape({ vertices: PropTypes.object, edges: PropTypes.object })
        },

        getInitialState() {
            return { viewport: this.props.viewport, generatePreview: true }
        },

        render() {
            const { viewport, generatePreview } = this.state;
            const { product, registry, panelPadding, setLayerOrder, onSelectElements, onUpdatePreview } = this.props;
            const { source: baseSource, sourceOptions: baseSourceOptions, ...config } = mapConfig();
            const layerExtensions = _.indexBy(registry['org.visallo.map.layer'], 'id');

            return (
                <div className="org-visallo-map" style={{height:'100%'}} ref={r => {this.wrap = r}}>
                    <OpenLayers
                        ref={c => {this._openlayers = c}}
                        product={product}
                        baseSource={baseSource}
                        baseSourceOptions={baseSourceOptions}
                        sourcesByLayerId={this.mapElementsToSources()}
                        layerExtensions={layerExtensions}
                        viewport={viewport}
                        generatePreview={generatePreview}
                        panelPadding={panelPadding}
                        clearCaches={this.requestUpdateDebounce}
                        setLayerOrder={setLayerOrder}
                        onTap={this.onTap}
                        onPan={this.onViewport}
                        onZoom={this.onViewport}
                        onContextTap={this.onContextTap}
                        onSelectElements={onSelectElements}
                        onMouseOver={this.onMouseOver}
                        onMouseOut={this.onMouseOut}
                        onUpdatePreview={onUpdatePreview.bind(this, this.props.product.id)}
                        {...config}
                />
                </div>
            )
        },

        componentWillReceiveProps(nextProps) {
            if (nextProps.product.id === this.props.product.id) {
                this.setState({ viewport: {}, generatePreview: false })
            } else {
                this.saveViewport(this.props)
                this.setState({ viewport: nextProps.viewport || {}, generatePreview: true })
            }
        },

        componentWillMount() {
            this.caches = {
                styles: {
                    canHandle: new DeepObjectCache(),
                    style: new DeepObjectCache(),
                    selectedStyle: new DeepObjectCache()
                },
                geometries: {
                    canHandle: new DeepObjectCache(),
                    geometry: new DeepObjectCache()
                }
            };
            this.requestUpdateDebounce = _.debounce(this.clearCaches, REQUEST_UPDATE_DEBOUNCE)
        },

        componentDidMount() {
            this.mounted = true;
            $(this.wrap).on('selectAll', (event) => {
                this.props.onSelectAll(this.props.product.id);
            })
            $(document).on('elementsCut.org-visallo-map', (event, { vertexIds }) => {
                this.props.onRemoveElementIds({ vertexIds, edgeIds: [] });
            })
            $(document).on('elementsPasted.org-visallo-map', (event, elementIds) => {
                this.props.onDropElementIds(elementIds)
            })

            this.legacyListeners({
                fileImportSuccess: { node: $('.products-full-pane.visible')[0], handler: (event, { vertexIds }) => {
                    this.props.onDropElementIds({vertexIds});
                }}
            })
        },

        componentWillUnmount() {
            this.mounted = false;
            this.removeEvents.forEach(({ node, func, events }) => {
                $(node).off(events, func);
            });

            $(this.wrap).off('selectAll');
            $(document).off('.org-visallo-map');
            this.saveViewport(this.props)
        },

        onTap({map, pixel}) {
            if (!map.hasFeatureAtPixel(pixel)) {
                this.props.onClearSelection();
            }
        },

        onMouseOver(ol, map, features) {
            const cluster = features && features[0];
            const coordinates = cluster && cluster.get('coordinates');
            if (coordinates && coordinates.length > 1) {
                clusterHover.show(ol, map, cluster, layerHelpers.styles.feature)
            }
        },

        onMouseOut(ol, map, features) {
            clusterHover.hide(ol, map, features);
        },

        onContextTap({map, pixel, originalEvent}) {
            const vertexIds = [];
            map.forEachFeatureAtPixel(pixel, cluster => {
                const features = cluster.get('features');
                if (features) {
                    features.forEach(f => {
                        const element = f.get('element');
                        if (element && element.type === 'vertex') {
                            vertexIds.push(element.id);
                        }
                    })
                }
            })

            if (vertexIds.length) {
                const { pageX, pageY } = originalEvent;
                this.props.onVertexMenu(
                    originalEvent.target,
                    vertexIds[0],
                    { x: pageX, y: pageY }
                );
            }
        },

        onViewport(event) {
            const view = event.target;

            var zoom = view.getResolution(), pan = view.getCenter();
            if (!this.currentViewport) this.currentViewport = {};
            this.currentViewport[this.props.product.id] = { zoom, pan: [...pan] };
        },

        saveViewport(props) {
            var productId = props.product.id;
            if (this.currentViewport && productId in this.currentViewport) {
                var viewport = this.currentViewport[productId];
                props.onUpdateViewport(productId, viewport);
            }
        },

        getGeometry(edgeInfo, element, ontology) {
            const { registry } = this.props;
            const calculatedGeometry = registry['org.visallo.map.geometry']
                .reduce((geometries, { canHandle, geometry, layer }) => {
                    /**
                     * Decide which elements to apply geometry
                     *
                     * @function org.visallo.map.geometry~canHandle
                     * @param {object} productEdgeInfo The edge info from product->vertex
                     * @param {object} element The element
                     * @param {Array.<object>} element.properties The element properties
                     * @param {object} ontology The ontology object for this element (concept/relationship)
                     * @returns {boolean} True if extension should handle this element (style/selectedStyle functions will be invoked.)
                     */
                    if (this.caches.geometries.canHandle.getOrUpdate(canHandle, edgeInfo, element, ontology)) {

                        /**
                         * Return an OpenLayers [`ol.geom.Geometry`](http://openlayers.org/en/latest/apidoc/ol.geom.Geometry.html)
                         * object for the given element.
                         *
                         * @function org.visallo.map.geometry~geometry
                         * @param {object} productEdgeInfo The edge info from product->vertex
                         * @param {object} element The element
                         * @param {Array.<object>} element.properties The element properties
                         * @param {object} ontology The ontology element (concept / relationship)
                         * @returns {ol.geom.Geometry}
                         */
                        const geo = this.caches.geometries.geometry.getOrUpdate(geometry, edgeInfo, element, ontology)
                        if (geo) {
                            geometries.push({
                                geometry: geo,
                                layer
                            });
                        }
                    }
                    return geometries
                }, [])

            if (calculatedGeometry.length) {
                if (calculatedGeometry.length > 1) {
                    console.warn('Multiple geometry extensions applying to element, ignoring others', calculatedGeometry.slice(1))
                }
                return calculatedGeometry[0]
            }
        },

        getStyles(edgeInfo, element, ontology) {
            const { registry } = this.props;
            const calculatedStyles = registry['org.visallo.map.style']
                .reduce((styles, { canHandle, style, selectedStyle }) => {

                    /**
                     * Decide which elements to apply style
                     *
                     * @function org.visallo.map.style~canHandle
                     * @param {object} productEdgeInfo The edge info from product->vertex
                     * @param {object} element The element
                     * @param {Array.<object>} element.properties The element properties
                     * @param {object} ontology The ontology object for this element (concept/relationship)
                     * @returns {boolean} True if extension should handle this element (style/selectedStyle functions will be invoked.)
                     */
                    if (this.caches.styles.canHandle.getOrUpdate(canHandle, edgeInfo, element, ontology)) {
                        if (style) {
                            /**
                             * Return an OpenLayers [`ol.style.Style`](http://openlayers.org/en/latest/apidoc/ol.style.Style.html)
                             * object for the given element.
                             *
                             * @function org.visallo.map.style~style
                             * @param {object} productEdgeInfo The edge info from product->vertex
                             * @param {object} element The element
                             * @param {Array.<object>} element.properties The element properties
                             * @returns {ol.style.Style}
                             */
                            const normalStyle = this.caches.styles.style.getOrUpdate(style, edgeInfo, element, ontology)
                            if (normalStyle) {
                                if (_.isArray(normalStyle)) {
                                    if (normalStyle.length) styles.normal.push(...normalStyle)
                                } else {
                                    styles.normal.push(normalStyle)
                                }
                            }
                        }

                        if (selectedStyle) {
                            const output = this.caches.styles.selectedStyle.getOrUpdate(selectedStyle, edgeInfo, element, ontology)
                            if (output) {
                                if (_.isArray(output)) {
                                    if (output.length) styles.selected.push(...output)
                                } else {
                                    styles.selected.push(output)
                                }
                            }
                        }
                    }
                    return styles;
                }, { normal: [], selected: []})

            if (calculatedStyles.normal.length || calculatedStyles.selected.length) {
                return calculatedStyles;
            }
        },

        mapElementsToSources() {
            const { product } = this.props;
            const { extendedData } = product;
            if (!extendedData || !extendedData.vertices) return [];
            const { vertices, edges } = this.props.elements;
            const elementsSelectedById = { ..._.indexBy(this.props.selection.vertices), ..._.indexBy(this.props.selection.edges) };
            const elements = Object.values(vertices).concat(Object.values(edges));
            const geoLocationProperties = _.groupBy(this.props.ontologyProperties, 'dataType').geoLocation;
            const pushFeatureToSource = ({ id, ...rest }, feature) => {
                if (!sources[id]) {
                    sources[id] = { features: [], ...rest };
                } else if (!sources[id].features) {
                    sources[id].features = [];
                }

                sources[id].features.push(feature);
            };

            const sources = {
                cluster: {
                    id: 'cluster',
                    type: 'cluster',
                    features: []
                }
            };

            elements.forEach(el => {
                const extendedDataType = extendedData[el.type === 'vertex' ? 'vertices' : 'edges'];
                const edgeInfo = extendedDataType[el.id];
                const ontology = F.vertex.ontology(el);
                const styles = this.getStyles(edgeInfo, el, ontology);
                const geometryOverride = this.getGeometry(edgeInfo, el, ontology)
                const geometry = geometryOverride && geometryOverride.geometry;
                const layer = geometryOverride && geometryOverride.layer || {};

                if (extendedData.vertices[el.id] && extendedData.vertices[el.id].ancillary) {
                    pushFeatureToSource({ id: 'ancillary', type: 'ancillary', ...layer }, {
                        id: el.id,
                        element: el,
                        selected,
                        styles,
                        geometry
                    });

                    return;
                }


                const geoShapePropertyKey = 'http://visallo.org/geo_data#84bea9ded0ce0c5024b7101c51595b87a2a28c8e'; //TODO generic
                const geoShapeProperties = F.vertex.props(el, geoShapePropertyKey);

                if (geoShapeProperties.length) {
                    const sourceConfig = {
                        id: el.id,
                        type: 'geoShape',
                        element: el,
                        selected,
                        styles
                    };

                    geoShapeProperties.forEach(geoShapeProp => {
                        pushFeatureToSource(sourceConfig, {
                            id: geoShapeProp.key,
                            geoShape: geoShapeProp.value,
                            element: el
                        });
                    });
                }

                const geoLocations = geoLocationProperties && geoLocationProperties.reduce((props, { title }) => {
                        const geoProps = F.vertex.props(el, title);
                        geoProps.forEach(geoProp => {
                            const { value } = geoProp;
                            if (value) {
                                const { latitude, longitude } = value;
                                if (!isNaN(latitude) && !isNaN(longitude)) {
                                    const validCoordinates = (latitude >= -90 && latitude <= 90) && (longitude >= -180 && longitude <= 180);
                                    if (validCoordinates) {
                                        props.push([longitude, latitude])
                                    } else {
                                        console.warn('Vertex has geoLocation with invalid coordinates', value, el)
                                    }
                                }
                            }
                        })
                        return props;
                    }, []),
                    selected = el.id in elementsSelectedById,
                    iconUrl = 'map/marker/image?' + $.param({
                        type: el.conceptType,
                        workspaceId: this.props.workspaceId,
                        scale: this.props.pixelRatio > 1 ? '2' : '1',
                    }),
                    iconUrlSelected = `${iconUrl}&selected=true`;

                pushFeatureToSource({ id: 'cluster', ...layer }, {
                    id: el.id,
                    element: el,
                    selected,
                    iconUrl,
                    iconUrlSelected,
                    iconSize: [22, 40].map(v => v * this.props.pixelRatio),
                    iconAnchor: [0.5, 1.0],
                    pixelRatio: this.props.pixelRatio,
                    styles,
                    geometry,
                    geoLocations
                });
            })

            return sources;
        },

        legacyListeners(map) {
            this.removeEvents = [];

            _.each(map, (handler, events) => {
                var node = this.wrap;
                var func = handler;
                if (!_.isFunction(handler)) {
                    node = handler.node;
                    func = handler.handler;
                }
                this.removeEvents.push({ node, func, events });
                $(node).on(events, func);
            })
        },

        clearCaches() {
            if (this.mounted) {
                Object.keys(this.caches).forEach(k => {
                    Object.keys(this.caches[k]).forEach(key => this.caches[k][key].clear())
                })
                this.forceUpdate();
            }
        }
    });

    return RegistryInjectorHOC(Map, [
        'org.visallo.map.style',
        'org.visallo.map.geometry',
        'org.visallo.map.layer'
    ])
});
