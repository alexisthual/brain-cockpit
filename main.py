import eel, os, random

eel.init("src", [".tsx", ".ts", ".jsx", ".js", ".html"])

eel.start({"port": 3000}, size=(320, 120))
