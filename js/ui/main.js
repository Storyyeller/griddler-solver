$(function() {
    /* TODO: this singleton should really be created inside the AppModel.js file, not here in main.js */
    window.AppModelSingleton = new AppModel();

    /* load all of our templates, create our main view, and slap it onto the body */
    TemplateLoader.load(["App", "Sidebar", "Griddler", "Content", "Board", "OpenDialog"], function() {
        var appView = new AppView({
            model: window.AppModelSingleton
        });
        $(document.body).append(appView.$el);
        appView.render();
    });
});