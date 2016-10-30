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
    };

    self.drawRect = function(x, y, width, height, fillColor) {
        self.context.beginPath();
        self.context.fillStyle = fillColor;
        self.context.fillRect(x, y, width, height);
        self.context.stroke();
    };

    self.drawMessage = function(message) {
        if (message !== undefined) {
            self.context.fillStyle = '#00F';
            self.context.strokeStyle = '#FFF';
            self.context.font = (self.canvas.height / 10) + 'px Impact';
            self.context.textAlign = 'center';
            self.context.fillText(message, self.canvas.width / 2, self.canvas.height / 2);
            self.context.strokeText(message, self.canvas.width / 2, self.canvas.height / 2);
        }
    };

    self.clear = function() {
        self.context.clearRect(0, 0, self.canvas.width, self.canvas.height);
    };
}
