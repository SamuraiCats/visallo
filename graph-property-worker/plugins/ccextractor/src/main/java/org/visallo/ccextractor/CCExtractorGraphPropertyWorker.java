package org.visallo.ccextractor;

import com.google.inject.Inject;
import org.visallo.core.ingest.graphProperty.GraphPropertyWorkData;
import org.visallo.core.ingest.graphProperty.GraphPropertyWorker;
import org.visallo.core.ingest.video.VideoTranscript;
import org.visallo.core.model.Description;
import org.visallo.core.model.Name;
import org.visallo.core.model.audit.AuditAction;
import org.visallo.core.model.properties.VisalloProperties;
import org.visallo.core.util.ProcessRunner;
import org.visallo.gpw.video.SubRip;
import org.vertexium.Element;
import org.vertexium.Metadata;
import org.vertexium.Property;
import org.vertexium.Vertex;
import org.vertexium.mutation.ExistingElementMutation;

import java.io.File;
import java.io.InputStream;

@Name("CC Extractor")
@Description("Extracts close captioning from a video file")
public class CCExtractorGraphPropertyWorker extends GraphPropertyWorker {
    private static final String PROPERTY_KEY = CCExtractorGraphPropertyWorker.class.getName();
    private ProcessRunner processRunner;

    @Override
    public void execute(InputStream in, GraphPropertyWorkData data) throws Exception {
        File ccFile = File.createTempFile("ccextract", "txt");
        ccFile.delete();
        try {
            processRunner.execute(
                    "ccextractor",
                    new String[]{
                            "-o", ccFile.getAbsolutePath(),
                            "-in=mp4",
                            data.getLocalFile().getAbsolutePath()
                    },
                    null,
                    data.getLocalFile().getAbsolutePath() + ": "
            );

            VideoTranscript videoTranscript = SubRip.read(ccFile);
            if (videoTranscript.getEntries().size() == 0) {
                return;
            }

            ExistingElementMutation<Vertex> m = data.getElement().prepareMutation();
            Metadata metadata = data.createPropertyMetadata();
            VisalloProperties.TEXT_DESCRIPTION_METADATA.setMetadata(metadata, "Close Caption", getVisibilityTranslator().getDefaultVisibility());
            addVideoTranscriptAsTextPropertiesToMutation(m, PROPERTY_KEY, videoTranscript, metadata, data.getVisibility());
            Vertex v = m.save(getAuthorizations());
            getAuditRepository().auditVertexElementMutation(AuditAction.UPDATE, m, v, PROPERTY_KEY, getUser(), data.getVisibility());
            getAuditRepository().auditAnalyzedBy(AuditAction.ANALYZED_BY, v, getClass().getSimpleName(), getUser(), data.getVisibility());

            getGraph().flush();
            pushVideoTranscriptTextPropertiesOnWorkQueue(data.getElement(), PROPERTY_KEY, videoTranscript, data.getPriority());
        } finally {
            ccFile.delete();
        }
    }

    @Override
    public boolean isHandled(Element element, Property property) {
        if (property == null) {
            return false;
        }

        if (!property.getName().equals(VisalloProperties.RAW.getPropertyName())) {
            return false;
        }
        String mimeType = VisalloProperties.MIME_TYPE_METADATA.getMetadataValue(property.getMetadata(), null);
        if (mimeType == null || !mimeType.startsWith("video")) {
            return false;
        }

        return true;
    }

    @Override
    public boolean isLocalFileRequired() {
        return true;
    }

    @Inject
    public void setProcessRunner(ProcessRunner ffmpeg) {
        this.processRunner = ffmpeg;
    }
}
