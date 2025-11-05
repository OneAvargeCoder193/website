const kuzma = document.getElementById("kuzma");
let angle = 0;
let scale = 1;
setInterval(() => {
    kuzma.style.transform = "rotate(" + angle + "deg)";
    angle += 0.1;
    kuzma.style.transform += "scale(" + scale + ")";
    scale = (scale - 1) * 0.95 + 1;
}, 1);
kuzma.addEventListener("click", () => {
    scale += 0.25;
});