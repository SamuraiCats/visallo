package org.visallo.core.model.user;

import java.util.List;

public interface AuthorizationRepository {

    void addAuthorizationToGraph(final String... auths);

    void removeAuthorizationFromGraph(final String auth);

    List<String> getGraphAuthorizations();
}
