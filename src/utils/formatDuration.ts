/**
 * Formats a duration in nano seconds to a string in the format `hh:mm:ss`.
 * @param nanoSecondsDuration
 */
export default function formatDuration_OLD(nanoSecondsDuration: number): string {
    if(nanoSecondsDuration < 0) return '00:00:00';
    const totalSeconds = Math.floor(nanoSecondsDuration / 1e9);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    return formattedTime;
}

