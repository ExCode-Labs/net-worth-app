// Custom entry: register the notification-listener headless task before the
// app boots, then hand off to expo-router's normal entry.
import "./src/services/notificationTask";
import "expo-router/entry";
