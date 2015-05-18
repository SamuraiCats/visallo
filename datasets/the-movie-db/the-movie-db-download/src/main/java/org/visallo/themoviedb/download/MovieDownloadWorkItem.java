package org.visallo.themoviedb.download;

import org.visallo.core.util.VisalloLogger;
import org.visallo.core.util.VisalloLoggerFactory;
import org.json.JSONObject;

import java.io.IOException;
import java.text.ParseException;

public class MovieDownloadWorkItem extends WorkItem {
    private static final VisalloLogger LOGGER = VisalloLoggerFactory.getLogger(MovieDownloadWorkItem.class);
    private final int movieId;

    public MovieDownloadWorkItem(int movieId) {
        this.movieId = movieId;
    }

    @Override
    public boolean process(TheMovieDbDownload theMovieDbDownload) throws IOException, ParseException {
        if (theMovieDbDownload.hasMovieInCache(movieId)) {
            return false;
        }
        LOGGER.debug("Downloading movie: %d", movieId);
        JSONObject movieJson = theMovieDbDownload.getTheMovieDb().getMovieInfo(movieId);
        theMovieDbDownload.writeMovie(movieId, movieJson);
        return true;
    }

    @Override
    public String toString() {
        return "MovieDownloadWorkItem{" +
                "movieId='" + movieId + '\'' +
                '}';
    }
}
