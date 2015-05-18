package org.visallo.sql.model;

import org.visallo.core.util.VisalloLogger;
import org.visallo.core.util.VisalloLoggerFactory;
import org.hibernate.Session;
import org.hibernate.SessionFactory;

public class HibernateSessionManager {
    private static VisalloLogger LOGGER = VisalloLoggerFactory.getLogger(HibernateSessionManager.class);
    private SessionFactory sessionFactory;

    private ThreadLocal<Session> threadLocalSession = new InheritableThreadLocal<Session>() {
        @Override
        protected Session initialValue() {
            LOGGER.info("Opening Hibernate session");
            return sessionFactory.openSession();
        }
    };

    // this is to prevent opening a session just to clear it
    private ThreadLocal<Boolean> threadLocalSessionIsOpen = new InheritableThreadLocal<Boolean>() {
        @Override
        protected Boolean initialValue() {
            return Boolean.FALSE;
        }
    };

    public HibernateSessionManager(SessionFactory factory) {
        sessionFactory = factory;
        threadLocalSession.remove();
    }

    public Session getSession() {
        threadLocalSessionIsOpen.set(Boolean.TRUE);
        return threadLocalSession.get();
    }

    public void clearSession() {
        if (threadLocalSessionIsOpen.get()) {
            Session session = threadLocalSession.get();
            if (session.isOpen()) {  // double checking
                session.close();
                LOGGER.info("Closed Hibernate session");
            }
        }

        threadLocalSession.remove();
        threadLocalSessionIsOpen.remove();
    }

}
