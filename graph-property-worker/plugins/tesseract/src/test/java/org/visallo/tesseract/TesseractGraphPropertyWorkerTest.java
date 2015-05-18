package org.visallo.tesseract;

import org.visallo.core.model.properties.VisalloProperties;
import org.visallo.test.GraphPropertyWorkerTestBase;
import org.apache.commons.io.IOUtils;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.runners.MockitoJUnitRunner;
import org.vertexium.Metadata;
import org.vertexium.Property;
import org.vertexium.Vertex;
import org.vertexium.Visibility;
import org.vertexium.property.StreamingPropertyValue;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.util.List;
import java.util.Map;

import static org.junit.Assert.*;
import static org.vertexium.util.IterableUtils.toList;

@RunWith(MockitoJUnitRunner.class)
public class TesseractGraphPropertyWorkerTest extends GraphPropertyWorkerTestBase {
    private Visibility visibility = new Visibility("");

    @Test
    public void testTesseractTestImage01() throws Exception {
        byte[] imageData = getResourceAsByteArray(TesseractGraphPropertyWorkerTest.class, "testImage01.jpg");

        Metadata metadata = new Metadata();
        VisalloProperties.MIME_TYPE_METADATA.setMetadata(metadata, "image/jpg", visibility);
        StreamingPropertyValue value = new StreamingPropertyValue(new ByteArrayInputStream(imageData), byte[].class);
        Vertex v1 = getGraph().prepareVertex("v1", visibility)
                .addPropertyValue("k1", "image", value, metadata, visibility)
                .save(getGraphAuthorizations());

        TesseractGraphPropertyWorker gpw = new TesseractGraphPropertyWorker();
        run(gpw, getWorkerPrepareData(), v1, v1.getProperty("k1", "image"), new ByteArrayInputStream(imageData));

        v1 = getGraph().getVertex("v1", getGraphAuthorizations());
        List<Property> textProperties = toList(VisalloProperties.TEXT.getProperties(v1));
        assertEquals(1, textProperties.size());
        Property textProperty = textProperties.get(0);
        StreamingPropertyValue textValue = (StreamingPropertyValue) textProperty.getValue();
        assertNotNull("textValue was null", textValue);
        String textValueString = IOUtils.toString(textValue.getInputStream());
        assertTrue("does not contain Tesseract", textValueString.contains("Tesseract"));

        assertEquals(1, getGraphPropertyQueue().size());
        JSONObject graphPropertyQueueItem = getGraphPropertyQueue().get(0);
        assertEquals(textProperty.getName(), graphPropertyQueueItem.getString("propertyName"));
        assertEquals(textProperty.getKey(), graphPropertyQueueItem.getString("propertyKey"));
        assertEquals(v1.getId(), graphPropertyQueueItem.getString("graphVertexId"));
    }

    @Override
    protected Map getConfigurationMap() {
        Map map = super.getConfigurationMap();
        File tessdataDir = new File("/usr/share/tesseract-ocr/tessdata/");
        if (tessdataDir.exists()) {
            map.put(TesseractGraphPropertyWorker.CONFIG_DATA_PATH, tessdataDir.getAbsolutePath());
        }

        tessdataDir = new File("/usr/local/share/tessdata");
        if (tessdataDir.exists()) {
            map.put(TesseractGraphPropertyWorker.CONFIG_DATA_PATH, tessdataDir.getAbsolutePath());
        }

        return map;
    }
}