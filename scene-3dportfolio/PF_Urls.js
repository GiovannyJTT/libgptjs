
const base_path = "./assets/images/pictures/";

const FOLDER_PICTURES = {
    valencia: [],
    helsinki: [],
    odense: [],
    oslo: []
}

Object.entries(FOLDER_PICTURES).forEach(
    ([k, v]) => {
        let city_img_paths = [];
        for (let i=0; i < 10; i++) {
            city_img_paths.push( base_path + k + "/img_" + i.toString().padStart(3, "0") );
        }
        FOLDER_PICTURES[k] = city_img_paths;
    }
);

export default FOLDER_PICTURES;