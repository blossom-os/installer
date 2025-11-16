var panels = panelIds();
for (var i = 0; i < panels.length; i++) {
    panelById(panels[i]).remove();
}
