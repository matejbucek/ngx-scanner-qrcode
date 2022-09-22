import { Component, ElementRef, EventEmitter, OnDestroy, OnInit, ViewChild } from '@angular/core';
import jsQR from './qrcode';

@Component({
  selector: 'ngx-scanner-qrcode',
  template: `<canvas #canvas [style.width.%]="100" [style.height.%]="100"></canvas><video #video playsinline style="display: none"></video><ng-content></ng-content>`,
  queries: {
    video: new ViewChild('video', { static: true }),
    canvas: new ViewChild('canvas', { static: true })
  },
  inputs: ['frameConfig', 'textConfig'],
  host: { 'class': 'ngx-scanner-qrcode' },
  outputs: ['data', 'error'],
  exportAs: 'scanner',
})
export class NgxScannerQrcodeComponent implements OnInit, OnDestroy {

  // @ViewChild
  // @Export
  public video!: ElementRef;
  public canvas!: ElementRef;

  // @Output
  // @Export
  public error = new EventEmitter<any>();
  public event = new EventEmitter<string>();

  // @Export
  public medias: MediaStreamConstraints = { video: { facingMode: "environment" } };
  public isStart = false;
  public isLoading = false;
  public data: string;

  /**
   * Properties
   * CanvasRenderingContext2D
   * https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
   */
  public frameConfig: Object = {
    lineWidth: 4,
    strokeStyle: '#008000'
  };
  public textConfig: Object = {
    font: '30px serif',
    fillStyle: '#008000'
  };

  ngOnInit(): void {
    this.initBackgroundColor();
  }

  /**
   * initBackgroundColor
   */
  private initBackgroundColor() {
    const ctx = this.canvas.nativeElement.getContext('2d') as CanvasRenderingContext2D;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
  }

  /**
   * toggleCamera
   */
  public toggleCamera() {
    if (this.isStart) this.stop();
    else this.start();
  }

  /**
   * start
   * @returns 
   */
  public start(): void {
    if (this.isStart) return;

    this.isLoading = true;

    /**
     * MediaStream
     * Use facingMode: environment to attemt to get the front camera on phones
     */
    navigator.mediaDevices.getUserMedia(this.medias).then((stream: MediaStream) => {
      this.isStart = true;
      this.video.nativeElement.srcObject = stream;
      this.video.nativeElement.setAttribute("playsinline", 'true'); // required to tell iOS safari we don't want fullscreen
      this.video.nativeElement.play();
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
      for (let key in this.frameConfig) {
        ctx[key] = this.frameConfig[key];
      }
      ctx.stroke();
    }

    const drawData = (code) => {
      if (this.textConfig) {
        for (let key in this.textConfig) {
          ctx[key] = this.textConfig[key];
        }
        const textString = code.data;
        const metrics = ctx.measureText(textString);
        ctx.fillText(textString, ((code.location.bottomLeftCorner.x + code.location.bottomRightCorner.x) / 2) - (metrics.width / 2), code.location.bottomRightCorner.y + 40);
      }
    }

    /**
     * scanner
     */
    const scanner = () => {
      if (this.video.nativeElement.readyState === this.video.nativeElement.HAVE_ENOUGH_DATA) {
        this.canvas.nativeElement.height = this.video.nativeElement.videoHeight;
        this.canvas.nativeElement.width = this.video.nativeElement.videoWidth;
        ctx.drawImage(this.video.nativeElement, 0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
        const imageData = ctx.getImageData(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code) {
          drawFrame(code.location.topLeftCorner, code.location.topRightCorner);
          drawFrame(code.location.topRightCorner, code.location.bottomRightCorner);
          drawFrame(code.location.bottomRightCorner, code.location.bottomLeftCorner);
          drawFrame(code.location.bottomLeftCorner, code.location.topLeftCorner);
          drawData(code);
          this.event.emit(code?.data ?? null);
          this.data = code?.data ?? null;
        }
        this.isLoading = false;
        this.canvas.nativeElement.onclick = () => this.video.nativeElement.paused ? this.play() : this.pause(); // pause when clicked on screen and resume on next click
      }
      requestAnimationFrame(scanner);
    }
  }

  /**
   * Video play
   * @return void
   */
  public play(): void {
    this.video?.nativeElement?.play();
  }

  /**
   * Video pause
   * @return void
   */
  public pause(): void {
    this.video?.nativeElement?.pause();
  }

  /**
   * Video stop
   * @return void
   */
  public stop(): void {
    this.isStart = false;
    this.isLoading = false;
    this.event.emit(null);
    try {
      this.video?.nativeElement?.srcObject?.getTracks()?.forEach((track: any) => track?.stop());
    } catch (error) {
      this.error.emit(error);
    }
  }

  /**
   * Download image
   * @param fileName eg: demo.png
   * @return string
   */
  public download(fileName: string): string {
    const dataURL = this.canvas?.nativeElement?.toDataURL(`image/${fileName?.split('.')?.slice(-1)?.toString()}`);
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataURL;
    link.click();
    return dataURL;
  }

  ngOnDestroy(): void {
    this.pause();
  }
}