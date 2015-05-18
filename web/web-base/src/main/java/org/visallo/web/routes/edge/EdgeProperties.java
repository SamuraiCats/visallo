package org.visallo.web.routes.edge;

import com.google.inject.Inject;
import org.visallo.core.config.Configuration;
import org.visallo.core.model.ontology.OntologyRepository;
import org.visallo.core.model.user.UserRepository;
import org.visallo.core.model.workspace.WorkspaceRepository;
import org.visallo.core.user.User;
import org.visallo.core.util.ClientApiConverter;
import org.visallo.web.BaseRequestHandler;
import org.visallo.web.clientapi.model.ClientApiEdge;
import org.vertexium.*;
import com.v5analytics.webster.HandlerChain;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public class EdgeProperties extends BaseRequestHandler {
    private final Graph graph;
    private final OntologyRepository ontologyRepository;

    @Inject
    public EdgeProperties(
            final OntologyRepository ontologyRepository,
            final Graph graph,
            final UserRepository userRepository,
            final WorkspaceRepository workspaceRepository,
            final Configuration configuration) {
        super(userRepository, workspaceRepository, configuration);
        this.ontologyRepository = ontologyRepository;
        this.graph = graph;
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, HandlerChain chain) throws Exception {
        final String graphEdgeId = getAttributeString(request, "graphEdgeId");

        User user = getUser(request);
        Authorizations authorizations = getAuthorizations(request, user);
        String workspaceId = getActiveWorkspaceId(request);

        Edge edge = graph.getEdge(graphEdgeId, authorizations);
        if (edge == null) {
            super.respondWithNotFound(response, "Could not find edge: " + graphEdgeId);
            return;
        }

        Vertex sourceVertex = edge.getVertex(Direction.OUT, authorizations);
        if (sourceVertex == null) {
            super.respondWithNotFound(response, "Could not find sourceVertex: " + edge.getVertexId(Direction.OUT));
            return;
        }

        Vertex targetVertex = edge.getVertex(Direction.IN, authorizations);
        if (targetVertex == null) {
            super.respondWithNotFound(response, "Could not find targetVertex: " + edge.getVertexId(Direction.IN));
            return;
        }

        ClientApiEdge results = ClientApiConverter.toClientApiEdgeWithVertexData(edge, sourceVertex, targetVertex, workspaceId, authorizations);

        respondWithClientApiObject(response, results);
    }
}
