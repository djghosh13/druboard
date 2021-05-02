class DNotification {
    static create(text, time = 0) {
        let notif = document.createElement("div");
        notif.classList.add("notification");
        notif.classList.add("new-notif");
        notif.innerHTML = text;
        notif.addEventListener("click", event => DNotification.remove(notif));
        document.querySelector("#notifications").appendChild(notif);
        window.setTimeout(() => notif.classList.remove("new-notif"), 10);
        if (time) {
            window.setTimeout(DNotification.remove, time, notif);
        }
        return notif;
    }

    static remove(notif) {
        notif.remove();
    }
}