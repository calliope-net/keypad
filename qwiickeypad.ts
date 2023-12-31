
//% color=#BF007F icon="\uf1ac" block="Keypad" weight=10
namespace qwiickeypad
/* 230815 231007 https://github.com/calliope-net/key-qwiickeypad
https://github.com/sparkfunX/Qwiic_Keypad
https://www.sparkfun.com/products/14641

This example prints which button was pressed. Press * for space and # for new line.
https://github.com/sparkfunX/Qwiic_Keypad/blob/master/Examples/Example1_ReadLastButton/Example1_ReadLastButton.ino



Programmier-Beispiele, i2c-Module, Bilder, Bezugsquellen:
https://calliope-net.github.io/i2c-test/

Code anhand der Arduino Library und Datenblätter neu programmiert von Lutz Elßner im August 2023
*/ {
    // https://learn.sparkfun.com/tutorials/qwiic-keypad-hookup-guide/hardware-overview
    // [Jumper] Open/Cut: Factory or Set I2C Slave Address: 0x4B (Factory Set) or 0x## (User Set)
    //          Bridged: I2C Jumper Default Slave Address: 0x4A (Alternate)
    export enum eADDR { KEY_x4B = 0x4B, Keypad_x4B = 0x4B, KEY_x4A_Jumper = 0x4A } //75 (0x4B) is default, 74 if jumper is closed
    let n_i2cCheck: boolean = false // i2c-Check
    let n_i2cError: number = 0 // Fehlercode vom letzten WriteBuffer (0 ist kein Fehler)

    //Map to the various registers on the Keypad
    export enum eKeypadRegisters {
        KEYPAD_ID = 0x00,
        KEYPAD_VERSION1 = 0x01,
        KEYPAD_VERSION2 = 0x02,
        KEYPAD_BUTTON = 0x03,
        KEYPAD_TIME_MSB = 0x04,
        KEYPAD_TIME_LSB = 0x05,
        KEYPAD_UPDATE_FIFO = 0x06,
        KEYPAD_CHANGE_ADDRESS = 0x07
    }


    //% group="beim Start"
    //% block="i2c %pADDR i2c-Check %ck"
    //% pADDR.shadow="qwiickeypad_eADDR"
    //% ck.shadow="toggleOnOff" ck.defl=1
    export function beimStart(pADDR: number, ck: boolean) {
        n_i2cCheck = ck
        n_i2cError = 0 // Reset Fehlercode
    }

    //% group="Text"
    //% block="i2c %pADDR lese nächste Taste (1 Zeichen oder '')" weight=6
    //% pADDR.shadow="qwiickeypad_eADDR"
    export function getChar(pADDR: number): string {
        let code = getButton(pADDR)
        if (code == 0)
            return ""
        else
            return String.fromCharCode(code)
    }

    export enum eDigits { nur_Ziffern, alle_Zeichen }

    //% group="Text"
    //% block="i2c %pADDR lese alle Tasten %pDigits" weight=4
    //% pADDR.shadow="qwiickeypad_eADDR"
    export function getChars(pADDR: number, pDigits: eDigits): string {
        let code: number
        let zahl: string = "" // https://learn.sparkfun.com/tutorials/qwiic-keypad-hookup-guide/hardware-overview
        for (let i = 0; i < 16; i++) { // the FIFO stack stores the most recent 15 button inputs.
            code = getButton(pADDR)
            if (code == 0 || pDigits == eDigits.nur_Ziffern && !(code >= 48 && code <= 57)) {
                break//[48, 49, 50, 51, 52, 53, 54, 55, 56, 57].indexOf(code) < 0
            } else {
                zahl = zahl + String.fromCharCode(code)
            }
        }
        return zahl
    }

    //% group="Text"
    //% block="i2c %pADDR wiederhole letzte Taste (* oder #)" weight=2
    //% pADDR.shadow="qwiickeypad_eADDR"
    export function getlastChar(pADDR: number): string {
        let code = readRegister(pADDR, eKeypadRegisters.KEYPAD_BUTTON, false)
        if (code == 0) { return "" }
        else { return String.fromCharCode(code) }
    }


    // ========== group="Zahl"

    //% group="Zahl"
    //% block="i2c %pADDR lese Taste (ASCII Code)" weight=4
    //% pADDR.shadow="qwiickeypad_eADDR"
    export function getButton(pADDR: number): number {
        /*
        "commands" keypad to plug in the next button into the registerMap
        note, this actually sets the bit0 on the updateFIFO register
    
        necessary for keypad to pull button from stack to readable register
        */
        writeRegister(pADDR, eKeypadRegisters.KEYPAD_UPDATE_FIFO, 1, true)
        return readRegister(pADDR, eKeypadRegisters.KEYPAD_BUTTON, false)
    }

    //% group="Zahl"
    //% block="i2c %pADDR Zeit seit dem Drücken in ms (UInt16)" weight=2
    //% pADDR.shadow="qwiickeypad_eADDR"
    export function getTimeSincePressed(pADDR: number): number {
        return (readRegister(pADDR, eKeypadRegisters.KEYPAD_TIME_MSB, true) << 8)
            | readRegister(pADDR, eKeypadRegisters.KEYPAD_TIME_LSB, false)
    }



    // ========== advanced=true
    // ========== group="Keypad Register"

    //% group="Keypad Register" advanced=true
    //% block="i2c %pADDR writeRegister %pRegister %byte || repeat %pRepeat" weight=2
    //% pADDR.shadow="qwiickeypad_eADDR"
    //% pRegister.defl=qwiickeypad.eKeypadRegisters.KEYPAD_UPDATE_FIFO
    //% byte.min=0 byte.max=255 byte.defl=1
    //% inlineInputMode=inline
    export function writeRegister(pADDR: number, pRegister: eKeypadRegisters, byte: number, pRepeat?: boolean) {
        let bu = Buffer.create(2)
        bu.setUint8(0, pRegister)
        bu.setUint8(1, byte)
        i2cWriteBuffer(pADDR, bu, pRepeat)
    }

    //% group="Keypad Register" advanced=true
    //% block="i2c %pADDR readRegister %pRegister || repeat %pRepeat" weight=1
    //% pADDR.shadow="qwiickeypad_eADDR"
    export function readRegister(pADDR: number, pRegister: eKeypadRegisters, pRepeat?: boolean) {
        let bu = Buffer.create(1)
        bu.setUint8(0, pRegister)
        i2cWriteBuffer(pADDR, bu, true)

        bu = i2cReadBuffer(pADDR, 1, pRepeat)
        delay(25) // 25 ms is good, more is better
        return bu.getUint8(0)
    }


    // ========== group="i2c Adressen"

    //% blockId=qwiickeypad_eADDR
    //% group="i2c Adressen" advanced=true
    //% block="%pADDR" weight=4
    export function qwiickeypad_eADDR(pADDR: eADDR): number { return pADDR }

    //% group="i2c Adressen" advanced=true
    //% block="i2c Fehlercode" weight=2
    export function i2cError() { return n_i2cError }

    function i2cWriteBuffer(pADDR: number, buf: Buffer, repeat: boolean = false) {
        if (n_i2cError == 0) { // vorher kein Fehler
            n_i2cError = pins.i2cWriteBuffer(pADDR, buf, repeat)
            if (n_i2cCheck && n_i2cError != 0)  // vorher kein Fehler, wenn (n_i2cCheck=true): beim 1. Fehler anzeigen
                basic.showString(Buffer.fromArray([pADDR]).toHex()) // zeige fehlerhafte i2c-Adresse als HEX
        } else if (!n_i2cCheck)  // vorher Fehler, aber ignorieren (n_i2cCheck=false): i2c weiter versuchen
            n_i2cError = pins.i2cWriteBuffer(pADDR, buf, repeat)
        //else { } // n_i2cCheck=true und n_i2cError != 0: weitere i2c Aufrufe blockieren
    }

    function i2cReadBuffer(pADDR: number, size: number, repeat: boolean = false): Buffer {
        if (!n_i2cCheck || n_i2cError == 0)
            return pins.i2cReadBuffer(pADDR, size, repeat)
        else
            return Buffer.create(size)
    }


    // https://www.arduino.cc/reference/en/language/functions/time/delay/
    function delay(pMillisec: number) { control.waitMicros(1000 * pMillisec) }

} // qwiickeypad.ts
