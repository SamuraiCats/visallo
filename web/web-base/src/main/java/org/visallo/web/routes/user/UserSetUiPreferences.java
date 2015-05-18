package org.visallo.web.routes.user;

import com.v5analytics.webster.HandlerChain;
import com.google.inject.Inject;
import org.visallo.core.config.Configuration;
import org.visallo.core.model.user.UserRepository;
import org.visallo.core.model.workspace.WorkspaceRepository;
import org.visallo.core.user.User;
import org.visallo.web.BaseRequestHandler;
import org.json.JSONObject;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public class UserSetUiPreferences extends BaseRequestHandler {
    @Inject
    public UserSetUiPreferences(
            final UserRepository userRepository,
            final WorkspaceRepository workspaceRepository,
            final Configuration configuration) {
        super(userRepository, workspaceRepository, configuration);
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, HandlerChain chain) throws Exception {
        String uiPreferencesString = getOptionalParameter(request, "ui-preferences");
        String propertyName = getOptionalParameter(request, "name");
        String propertyValue = getOptionalParameter(request, "value");

        User user = getUser(request);
        if (user == null || user.getUsername() == null) {
            respondWithNotFound(response);
            return;
        }

        if (uiPreferencesString != null) {
            getUserRepository().setUiPreferences(user, new JSONObject(uiPreferencesString));
        } else if (propertyName != null) {
            user.getUiPreferences().put(propertyName, propertyValue);
            getUserRepository().setUiPreferences(user, user.getUiPreferences());
        } else {
            respondWithBadRequest(response, "ui-preferences", "either ui-preferences or name,value are required parameters.");
        }

        user = getUser(request);
        JSONObject userJson = getUserRepository().toJsonWithAuths(user);
        respondWithJson(response, userJson);
    }
}
