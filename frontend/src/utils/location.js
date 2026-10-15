// "Use my current location": browser geolocation + a free reverse-geocoding API
// (BigDataCloud's client endpoint needs no key). Fills city, state and pincode -
// the customer still types the house / street line themselves.
const REVERSE_GEOCODE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";

const getPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Your browser does not support location access."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 5 * 60 * 1000,
    });
  });

const explain = (error) => {
  if (error?.code === 1) return "Location permission was denied. You can type the address instead.";
  if (error?.code === 2) return "Your location could not be determined. Please type the address.";
  if (error?.code === 3) return "Finding your location took too long. Please try again.";
  return error?.message || "Could not detect your location.";
};

export const detectLocation = async () => {
  let position;
  try {
    position = await getPosition();
  } catch (error) {
    throw new Error(explain(error));
  }

  const { latitude, longitude } = position.coords;
  const url = `${REVERSE_GEOCODE_URL}?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;

  let place;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error();
    place = await response.json();
  } catch {
    throw new Error("Found you, but could not look up the address. Please type it in.");
  }

  if (place.countryCode && place.countryCode !== "IN") {
    throw new Error("ShopKart delivers within India only. Please enter an Indian address.");
  }

  const pincode = /^[1-9]\d{5}$/.test(place.postcode || "") ? place.postcode : "";

  return {
    addressLine2: place.locality && place.locality !== place.city ? place.locality : "",
    city: place.city || place.locality || "",
    state: place.principalSubdivision || "",
    pincode,
  };
};
