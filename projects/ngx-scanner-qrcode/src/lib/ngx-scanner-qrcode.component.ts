import { Component, ElementRef, EventEmitter, ViewChild } from '@angular/core';
import jsQR from './qrcode';

@Component({
  selector: 'ngx-scanner-qrcode',
  template: `<canvas #canvas [style.width.%]="100" [style.height.%]="100"></canvas>`,
  queries: { canvas: new ViewChild('divRef', { static: true }) },
  inputs: ['line', 'color'],
  outputs: ['data', 'error'],
  exportAs: 'scanner',
})
export class NgxScannerQrcodeComponent {

  // private
  private line = 4;
  private color = '#008000';
  private canvas: ElementRef;
  private data = new EventEmitter<string>();
  private error = new EventEmitter<any>();
  private videoElement: HTMLVideoElement | any;
  private medias: MediaStreamConstraints = { video: { facingMode: "environment" } };

  // public
  public isLoading = false;
  public isStart = false;

  ngOnInit(): void {
    this.initBackgroundColor();
  }

  /**
   * initBackgroundColor
   */
  private initBackgroundColor() {
    const ctx = this.canvas.nativeElement.getContext('2d') as CanvasRenderingContext2D;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
  }

  /**
   * toggleCamera
   */
  public toggleCamera() {
    if (this.isStart) {
      this.stop()
    } else {
      this.start();
    }
  }

  /**
   * start
   * @returns 
   */
  public start() {
    if (this.isStart) {
      return;
    }

    this.isLoading = true;
    this.videoElement = document.createElement('video');

    /**
     * MediaStream
     * Use facingMode: environment to attemt to get the front camera on phones
     */
    navigator.mediaDevices.getUserMedia(this.medias).then((stream: MediaStream) => {
      this.isStart = true;
      this.videoElement.srcObject = stream;
      this.videoElement.setAttribute("playsinline", 'true'); // required to tell iOS safari we don't want fullscreen
      this.videoElement.play();
      requestAnimationFrame(scanner);
    }).catch(() => this.stop());

    /**
     * drawFrame
     */
    const ctx = this.canvas.nativeElement.getContext('2d') as CanvasRenderingContext2D;
    const drawFrame = (begin, end) => {
      ctx.beginPath();
      ctx.moveTo(begin.x, begin.y);
      ctx.lineTo(end.x, end.y);
      ctx.lineWidth = this.line;
      ctx.strokeStyle = this.color;
      ctx.stroke();
    }

    /**
     * scanner
     */
    const scanner = () => {
      if (this.videoElement.readyState === this.videoElement.HAVE_ENOUGH_DATA) {
        this.canvas.nativeElement.height = this.videoElement.videoHeight;
        this.canvas.nativeElement.width = this.videoElement.videoWidth;
        ctx.drawImage(this.videoElement, 0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
        const imageData = ctx.getImageData(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code) {
          drawFrame(code.location.topLeftCorner, code.location.topRightCorner);
          drawFrame(code.location.topRightCorner, code.location.bottomRightCorner);
          drawFrame(code.location.bottomRightCorner, code.location.bottomLeftCorner);
          drawFrame(code.location.bottomLeftCorner, code.location.topLeftCorner);
          this.data.emit(code.data ? code.data : '');
        }
        this.isLoading = false;
      }
      requestAnimationFrame(scanner);
    }
  }

  /**
   * stop
   */
  public stop() {
    this.data.emit(null);
    this.isStart = false;
    this.isLoading = false;
    try {
      this.videoElement && this.videoElement.srcObject.getTracks().forEach(track => track.stop());
    } catch (error) {
      this.error.emit('No camera detected!');
    }
  }
}
