define(['openlayers', '../multiPointCluster'], function(ol, MultiPointCluster) {

    const FEATURE_HEIGHT = 40;
    const FEATURE_CLUSTER_HEIGHT = 24;

    const DEFAULT_LAYER_CONFIG = {
        sortable: true,
        toggleable: true
    };

    const layers = {
        tile: {
            configure(id, options = {}) {
                const { source, sourceOptions = {}, ...config } = options;
                let baseLayerSource;

                if (source in ol.source && _.isFunction(ol.source[source])) {
                    baseLayerSource = new ol.source[source]({
                        crossOrigin: 'anonymous',
                        ...sourceOptions
                    });
                } else {
                    console.error('Unknown map provider type: ', source);
                    throw new Error('map.provider is invalid')
                }

                const layer = new ol.layer.Tile({
                    ...DEFAULT_LAYER_CONFIG,
                    id,
                    label: 'Base',
                    type: 'tile',
                    sortable: false,
                    source: baseLayerSource,
                    ...config
                });

                return { source: baseLayerSource, layer }
            },

            addEvents(map, { source }, handlers) {
                return [
                    source.on('tileloaderror', function(event) {
                        const MaxRetry = 3;
                        const { tile } = event;

                        if (tile) {
                            tile._retryCount = (tile._retryCount || 0) + 1;
                            if (tile._retryCount <= MaxRetry) {
                                console.warn(`Tile error retry: ${tile._retryCount} of ${MaxRetry}`, tile.src_);
                                _.defer(() => {
                                    tile.load();
                                })
                            }
                        }
                    })
                ]
            }
        },

        cluster: {
            configure(id, options = {}) {
                const source = new ol.source.Vector({ features: [] });
                const clusterSource = new MultiPointCluster({
                    distance: Math.max(FEATURE_CLUSTER_HEIGHT, FEATURE_HEIGHT) / 2,
                    source
                });
                const layer = new ol.layer.Vector({
                    ...DEFAULT_LAYER_CONFIG,
                    id,
                    label: 'Cluster',
                    type: 'cluster',
                    style: cluster => this.style(cluster),
                    source: clusterSource,
                    ...options
                });

                return { source, clusterSource, layer }
            },

            style(cluster, options = { selected: false }) {
                const count = cluster.get('count');
                const selectionState = cluster.get('selectionState') || 'none';
                const selected = options.selected || selectionState !== 'none';

                if (count > 1) {
                    return styles.cluster(cluster, { selected });
                } else {
                    return styles.feature(cluster.get('features')[0], { selected })
                }
            },

            addEvents(map, { source, clusterSource, layer }, handlers) {
                const selectInteraction = new ol.interaction.Select({
                    condition: ol.events.condition.click,
                    layers: [layer],
                    style: cluster => this.style(cluster, { selected: true })
                });

                map.addInteraction(selectInteraction);

                const onSelectCluster = selectInteraction.on('select', function(e) {
                    const clusters = e.target.getFeatures().getArray(),
                        elements = { vertices: [], edges: [] };

                    clusters.forEach(cluster => {
                        cluster.get('features').forEach(feature => {
                            const el = feature.get('element');
                            const key = el.type === 'vertex' ? 'vertices' : 'edges';
                            elements[key].push(el.id);
                        })
                    })
                    handlers.onSelectElements(elements);
                });

                const onClusterSourceChange = clusterSource.on('change', _.debounce(function() {
                    var selected = selectInteraction.getFeatures(),
                        clusters = this.getFeatures(),
                        newSelection = [],
                        isSelected = feature => feature.get('selected');

                    clusters.forEach(cluster => {
                        var innerFeatures = cluster.get('features');
                        if (_.any(innerFeatures, isSelected)) {
                            newSelection.push(cluster);
                            if (_.all(innerFeatures, isSelected)) {
                                cluster.set('selectionState', 'all');
                            } else {
                                cluster.set('selectionState', 'some');
                            }
                        } else {
                            cluster.unset('selectionState');
                        }
                    })

                    selected.clear()
                    if (newSelection.length) {
                        selected.extend(newSelection)
                    }
                }, 100));

                return [
                    onSelectCluster,
                    onClusterSourceChange
                ]
            },

            update: syncFeatures
        },

        ancillary: {
            configure(id, options = {}) {
                const source = new ol.source.Vector({
                    features: [],
                    wrapX: false
                });
                const layer = new ol.layer.Vector({
                    ...DEFAULT_LAYER_CONFIG,
                    id,
                    type: 'ancillary',
                    sortable: false,
                    toggleable: false,
                    source,
                    renderBuffer: 500,
                    updateWhileInteracting: true,
                    updateWhileAnimating: true,
                    style: ancillary => this.style(ancillary),
                    ...options
                });

                return { source, layer }
            },

            style(ancillary) {
                const extensionStyles = ancillary.get('styles');
                if (extensionStyles) {
                    const { normal } = extensionStyles;
                    if (normal.length) {
                        return normal;
                    }
                }
            },

            update: syncFeatures
        },

        geoShape: {
            configure(id, options = {}) {
                const source = new ol.source.Vector({ features: [] });
                const layer = new ol.layer.Vector({
                    ...DEFAULT_LAYER_CONFIG,
                    id,
                    type: 'geoShape',
                    source,
                    ...options
                });

                return { source, layer };
            },

            addEvents(map, { source, layer }, handlers) {
                const elements = { vertices: [], edges: [] };
                const element = layer.get('element');
                const key = element.type === 'vertex' ? 'vertices' : 'edges';

                elements[key].push(element.id);

                const onGeoShapeClick = map.on('click', (e) => {
                    const { map, pixel } = e;

                    const featuresAtPixel = map.getFeaturesAtPixel(pixel);

                    if (featuresAtPixel && featuresAtPixel.length === 1) {
                        const feature = featuresAtPixel[0];
                        if (source.getFeatureById(feature.getId())) {
                            handlers.onSelectElements(elements);
                        }
                    }
                });

                return [ onGeoShapeClick ]
            },

            update(source, { source: olSource, layer }) {
                const { element, features, selected, styles } = source;
                const nextFeatures = [];
                let changed = false;
                let fitFeatures;

                if (element !== layer.get('element') || !olSource.getFeatures().length) {
                    features.forEach(feature => {
                        const geoShapeFeatures = (new ol.format.GeoJSON()).readFeatures(feature.geoShape);

                        geoShapeFeatures.forEach((f, i) => {
                            f.setId(feature.id + ':' + i);
                            nextFeatures.push(f);
                        });
                    });

                    olSource.clear();
                    olSource.addFeatures(nextFeatures);

                    changed = true;
                    fitFeatures = nextFeatures;
                }

                return { changed, fitFeatures };
            }
        }
    };


    const styles = {
        feature(feature, { selected = false } = {}) {
            const isSelected = selected || feature.get('selected');
            const extensionStyles = feature.get('styles')

            if (extensionStyles) {
                const { normal: normalStyle, selected: selectedStyle } = extensionStyles;
                let style;
                if (normalStyle.length && (!selected || !selectedStyle.length)) {
                    style = normalStyle;
                } else if (selectedStyle.length && selected) {
                    style = selectedStyle;
                }

                if (style) {
                    return style;
                }
            }
            return [new ol.style.Style({
                image: new ol.style.Icon({
                    src: feature.get(isSelected ? 'iconUrlSelected' : 'iconUrl'),
                    imgSize: feature.get('iconSize'),
                    scale: 1 / feature.get('pixelRatio'),
                    anchor: feature.get('iconAnchor')
                })
            })]
        },

        cluster(cluster, { selected = false } = {}) {
            var count = cluster.get('count'),
                selectionState = cluster.get('selectionState') || 'none',
                radius = Math.min(count || 0, FEATURE_CLUSTER_HEIGHT / 2) + 10,
                unselectedFill = 'rgba(241,59,60, 0.8)',
                unselectedStroke = '#AD2E2E',
                stroke = selected ? '#08538B' : unselectedStroke,
                strokeWidth = Math.round(radius * 0.1),
                textStroke = stroke,
                fill = selected ? 'rgba(0,112,195, 0.8)' : unselectedFill;

            if (selected && selectionState === 'some') {
                fill = unselectedFill;
                textStroke = unselectedStroke;
                strokeWidth *= 2;
            }

            return [new ol.style.Style({
                image: new ol.style.Circle({
                    radius: radius,
                    stroke: new ol.style.Stroke({
                        color: stroke,
                        width: strokeWidth
                    }),
                    fill: new ol.style.Fill({
                        color: fill
                    })
                }),
                text: new ol.style.Text({
                    text: count.toString(),
                    font: `bold condensed ${radius}px sans-serif`,
                    textAlign: 'center',
                    fill: new ol.style.Fill({
                        color: '#fff',
                    }),
                    stroke: new ol.style.Stroke({
                        color: textStroke,
                        width: 2
                    })
                })
            })];
        }
    };

    function setLayerConfig(config, layer) {
        const { visible, opacity, zIndex, ...properties } = config;

        _.mapObject(properties, (value, key) => {
            if (value === null) {
                layer.unset(key);
            } else {
                layer.set(key, value);
            }
        })

        if (visible !== undefined) { layer.setVisible(visible) }
        if (opacity !== undefined) { layer.setOpacity(opacity) }
        if (zIndex !== undefined) { layer.setZIndex(zIndex) }
    }

    function syncFeatures({ features }, { source }) {
        const existingFeatures = _.indexBy(source.getFeatures(), f => f.getId());
        const newFeatures = [];
        var changed = false;

        if (features) {
            for (let featureIndex = 0; featureIndex < features.length; featureIndex++) {
                const data = features[featureIndex];
                const { id, styles, geometry: geometryOverride, geoLocations, element, ...rest } = data;
                let geometry = null;

                if (geometryOverride) {
                    geometry = geometryOverride;
                } else if (geoLocations) {
                    geometry = new ol.geom.MultiPoint(geoLocations.map(geo => ol.proj.fromLonLat(geo)))
                }

                if (geometry) {
                    let featureValues = {
                        ...rest,
                        element,
                        geoLocations,
                        geometry
                    };

                    if (styles) {
                        const { normal, selected } = styles;
                        if (normal && normal.length) {
                            const radius = getRadiusFromStyles(normal);
                            const normalImage = _.isFunction(normal[0].getImage) &&
                                normal[0].getImage();

                            featureValues._nodeRadius = radius

                            if (selected.length === 0 && !geometryOverride && normalImage && _.isFunction(normalImage.getStroke)) {
                                const newSelected = normal[0].clone();
                                const newStroke = new ol.style.Stroke({
                                    color: '#0088cc',
                                    width: normal[0].getImage().getStroke().getWidth() || 1
                                })
                                newSelected.image_ = normal[0].getImage().clone({
                                    stroke: newStroke,
                                    opacity: 1
                                });

                                featureValues.styles = {
                                    normal,
                                    selected: [newSelected]
                                }
                            } else {
                                featureValues.styles = styles;
                            }
                        }
                    }

                    if (id in existingFeatures) {
                        const existingFeature = existingFeatures[id];
                        let diff = _.any(existingFeature.getProperties(), (val, name) => {
                            if (name === 'styles' || name === 'interacting') return false;
                            if (val !== featureValues[name]) {
                                return true
                            }
                            return false;

                        })
                        if (diff) {
                            changed = true
                            if (existingFeature.get('interacting')) {
                                delete featureValues.geometry;
                            }
                            existingFeature.setProperties(featureValues)
                        }
                        delete existingFeatures[id];
                    } else {
                        var feature = new ol.Feature(featureValues);
                        feature.setId(data.id);
                        newFeatures.push(feature);
                    }
                }
            }
        }

        let fitFeatures;
        if (newFeatures.length) {
            changed = true
            source.addFeatures(newFeatures);
            fitFeatures = newFeatures;
        }
        if (!_.isEmpty(existingFeatures)) {
            changed = true
            _.forEach(existingFeatures, feature => source.removeFeature(feature));
        }
        return { changed, fitFeatures };
    }

    function getRadiusFromStyles(styles) {
        for (let i = styles.length - 1; i >= 0; i--) {
            if (_.isFunction(styles[i].getImage)) {
                const image = styles[i].getImage();
                const radius = image && _.isFunction(image.getRadius) && image.getRadius();

                if (radius) {
                    const nodeRadius = radius / devicePixelRatio
                    return nodeRadius;
                }
            }
        }
    }

    return {
        byType: layers,
        styles,
        setLayerConfig
    }
})