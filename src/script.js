const skibidi = document.getElementById("skibidi");
let angle = 0;
let scale = 1;
setInterval(() => {
    skibidi.style.transform = "rotate(" + angle + "deg)";
    angle += 0.1;
    skibidi.style.transform += "scale(" + scale + ")";
    scale = (scale - 1) * 0.95 + 1;
}, 1);
skibidi.addEventListener("click", () => {
    scale += 0.25;
});