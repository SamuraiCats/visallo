package org.visallo.reindex;

import org.visallo.core.ingest.graphProperty.GraphPropertyWorkData;
import org.visallo.core.ingest.graphProperty.GraphPropertyWorker;
import org.visallo.core.model.Description;
import org.visallo.core.model.Name;
import org.vertexium.Element;
import org.vertexium.GraphBaseWithSearchIndex;
import org.vertexium.Property;
import org.vertexium.search.SearchIndex;

import java.io.InputStream;

@Name("Re-index")
@Description("Re-index an element in the search index")
public class ReIndexGraphPropertyWorker extends GraphPropertyWorker {
    @Override
    public void execute(InputStream in, GraphPropertyWorkData data) throws Exception {
        if (getGraph() instanceof GraphBaseWithSearchIndex) {
            SearchIndex searchIndex = ((GraphBaseWithSearchIndex) getGraph()).getSearchIndex();
            searchIndex.addElement(getGraph(), data.getElement(), data.getElement().getAuthorizations());
        }
    }

    @Override
    public boolean isHandled(Element element, Property property) {
        if (property == null) {
            return true;
        }

        return false;
    }
}
