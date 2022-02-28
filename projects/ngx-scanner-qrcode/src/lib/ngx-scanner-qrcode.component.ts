import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import jsQR from './qrcode';

@Component({
  selector: 'ngx-scanner-qrcode',
  template: `<canvas #canvas [style.height.px]="height" [style.width.px]="width"></canvas>`,
  exportAs: 'scanner'
})
export class NgxScannerQrcodeComponent {

  @ViewChild('canvas', { static: true }) canvasElm: ElementRef;
  @Input() color: string = '#008000';
  @Input() height: number = 300;
  @Input() width: number = 400;
  @Input() line: number = 3;
  @Output() data = new EventEmitter(null);
  @Output() message = new EventEmitter(null);
  @Output() loading = new EventEmitter(null);

  private video: any;
  private medias: MediaStreamConstraints = { video: { facingMode: "environment" } };

  public start() {
    this.video = document.createElement("video");
    const canvasElement = this.canvasElm.nativeElement;
    const canvas = canvasElement.getContext('2d') as CanvasRenderingContext2D;
    const drawFrame = (begin, end) => {
      canvas.beginPath();
      canvas.moveTo(begin.x, begin.y);
      canvas.lineTo(end.x, end.y);
      canvas.lineWidth = this.line;
      canvas.strokeStyle = this.color;
      canvas.stroke();
    }
    // Use facingMode: environment to attemt to get the front camera on phones
    navigator.mediaDevices.getUserMedia(this.medias).then((stream: MediaStream) => {
      this.video.srcObject = stream;
      this.video.setAttribute("playsinline", 'true'); // required to tell iOS safari we don't want fullscreen
      this.video.play();
      requestAnimationFrame(scanner);
    });
    const scanner = () => {
      this.loading.emit(true);
      if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
        this.loading.emit(false);
        canvas.drawImage(this.video, 0, 0, canvasElement.width, canvasElement.height);
        var imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
        var code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code) {
          drawFrame(code.location.topLeftCorner, code.location.topRightCorner);
          drawFrame(code.location.topRightCorner, code.location.bottomRightCorner);
          drawFrame(code.location.bottomRightCorner, code.location.bottomLeftCorner);
          drawFrame(code.location.bottomLeftCorner, code.location.topLeftCorner);
          this.data.emit(code.data);
          this.message.emit('');
        } else {
          this.data.emit('No QR code detected.');
          this.message.emit(null);
        }
      }
      requestAnimationFrame(scanner);
    }
  }

  public stop() {
    this.video.srcObject.getTracks().forEach(track => track.stop());
  }

}
