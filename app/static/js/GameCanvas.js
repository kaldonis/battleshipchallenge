function GameCanvasViewModel(canvas) {
    var self = this;

    self.canvas = canvas;
    self.context = canvas.getContext("2d");
    self.message = ko.observable('CLICK START');

    self.drawLine = function(x1, y1, x2, y2, lineWidth, color) {
        self.context.beginPath();
        self.context.moveTo(x1, y1);
        self.context.lineTo(x2, y2);
        self.context.lineWidth = lineWidth;
        self.context.strokeStyle = color;
        self.context.stroke();
    };

    self.drawCircle = function(centerX, centerY, radius, fillColor, borderColor) {
        self.context.beginPath();
        self.context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
        self.context.fillStyle = fillColor;
        self.context.fill();
        self.context.lineWidth = 1;
        self.context.strokeStyle = borderColor;
        self.context.stroke();
    }
}
