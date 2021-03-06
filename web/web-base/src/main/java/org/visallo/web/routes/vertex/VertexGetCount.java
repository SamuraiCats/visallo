package org.visallo.web.routes.vertex;

import com.google.inject.Inject;
import com.google.inject.Singleton;
import com.v5analytics.webster.ParameterizedHandler;
import com.v5analytics.webster.annotations.Handle;
import org.vertexium.Authorizations;
import org.vertexium.Graph;
import org.visallo.web.clientapi.model.ClientApiVertexCount;

@Singleton
public class VertexGetCount implements ParameterizedHandler {
    private final Graph graph;

    @Inject
    public VertexGetCount(Graph graph) {
        this.graph = graph;
    }

    @Handle
    public ClientApiVertexCount handle(
            Authorizations authorizations
    ) throws Exception {
        long vertexCount = graph.getVertexCount(authorizations);
        return new ClientApiVertexCount(vertexCount);
    }
}
