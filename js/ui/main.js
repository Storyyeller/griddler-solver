$(function() {
    window.AppModelSingleton = new AppModel();

    TemplateLoader.load(["App", "Sidebar", "Puzzle", "Content", "Griddler", "OpenDialog"], function() {
        var appView = new AppView({
            model: window.AppModelSingleton
        });
        $(document.body).append(appView.$el);
        appView.render();
    });
});