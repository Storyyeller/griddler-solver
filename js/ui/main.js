$(function() {
    window.AppModelSingleton = new AppModel();

    TemplateLoader.load(["App", "Sidebar", "Griddler", "Content", "Board", "OpenDialog"], function() {
        var appView = new AppView({
            model: window.AppModelSingleton
        });
        $(document.body).append(appView.$el);
        appView.render();
    });
});